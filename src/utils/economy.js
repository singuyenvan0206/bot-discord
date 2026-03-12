const SHOP_ITEMS = require('./shopItems');

/**
 * Parses a string amount into a number, supporting abbreviations (k, m, b) and shorthand like "all".
 */
function parseAmount(input, balance = 0, cap = null) {
    if (typeof input === 'number') return Math.floor(input);
    if (!input || typeof input !== 'string') return 0;

    const str = input.toLowerCase().trim();
    if (str === 'all' || str === 'max' || str === 'a') {
        if (cap !== null) return Math.min(balance, cap);
        return balance;
    }

    const units = {
        'k': 1000,
        'm': 1000000,
        'b': 1000000000
    };

    const match = str.match(/^([\d.]+)([kmb])?$/);
    if (!match) return parseInt(str) || 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    if (unit && units[unit]) {
        return Math.floor(value * units[unit]);
    }

    return Math.floor(value);
}

/**
 * Calculates a user's total net worth (Wallet + Inventory Value).
 * @param {object} userData User data from the database.
 * @returns {number} The total net worth.
 */
function calculateNetWorth(userData) {
    if (!userData) return 0;

    let total = userData.balance || 0;
    const inventory = JSON.parse(userData.inventory || '{}');

    for (const [id, count] of Object.entries(inventory)) {
        const item = SHOP_ITEMS.find(i => String(i.id) === id);
        if (item) {
            total += (item.price * count);
        }
    }

    return total;
}

/**
 * Adds profit to the bot (the "House") and grants it XP.
 * @param {object} context Discord Message or Interaction or Client.
 * @param {number} amount Profit amount.
 */
async function addHouseProfit(context, amount) {
    if (!amount || amount <= 0) return;

    const guildId = context.guild?.id || context.guildId;
    if (!guildId) return;

    const db = require('../database');
    const { calculateLevel } = require('./leveling');
    const config = require('../config');

    const client = context.client || context.member?.client || (context.guild?.client);
    if (!client) return;

    const botId = client.user.id;

    // Implementation of Money Burn Mechanism
    // Only a portion of the profit goes to the Bot Fund for redistribution.
    // The rest is "burned" (deleted from economy) to fight inflation.
    const retentionRate = config.ECONOMY.HOUSE_RETENTION_RATE || 0.4;
    const amountToFund = Math.floor(amount * retentionRate);

    // Get current bot stats for this guild
    const botUser = await db.getUser(botId, guildId);

    // Update balance (only the retained portion)
    if (amountToFund > 0) {
        try {
            const { getGuildSetting, setGuildSetting } = require('../database/guilds');
            const currentBalance = await getGuildSetting(guildId, 'bot_balance', 0);
            await setGuildSetting(guildId, 'bot_balance', Number(currentBalance) + amountToFund);
            console.log(`[Economy] Added house profit for guild ${guildId}: Total ${amount}, Fund ${amountToFund} (retained ${retentionRate * 100}%)`);
        } catch (dbErr) {
            console.error(`[Economy] Failed to add house profit to guild settings for ${guildId}:`, dbErr);
            // Fallback to generic addBalance which might use users table if botId not set
            await db.addBalance(guildId, botId, amountToFund);
        }
    } else if (amount > 0) {
        console.log(`[Economy] House profit for guild ${guildId}: Total ${amount}, Fund 0 (retained 0%)`);
    }

    // Grant XP to bot: Always based on total amount to reflect activity level
    const xpGain = Math.max(5, Math.min(50, Math.floor(amount / 10)));
    const xpResult = await db.addGlobalXp(botId, xpGain, guildId);

    const newLevel = calculateLevel(xpResult.xp);

    if (newLevel > botUser.level) {
        await db.setGuildSetting(guildId, 'bot_level', newLevel);
    }
}

/**
 * Calculates the dynamic maximum bet for a user, considering housing bonuses.
 * @param {string} userId User ID.
 * @returns {number} The maximum bet amount.
 */
async function getMaxBet(userId) {
    const config = require('../config');
    const db = require('../database');
    const housingConfig = require('../config/housing');

    const user = await db.getUser(userId);
    let maxBet = config.ECONOMY.MAX_BET || 250000;

    if (user.house_id && housingConfig.TIERS[user.house_id]) {
        maxBet += housingConfig.TIERS[user.house_id].max_bet_bonus;

        // Add interiors
        const houseData = JSON.parse(user.house_data || '{}');
        Object.keys(houseData).forEach(id => {
            const deco = housingConfig.INTERIORS[id];
            if (deco && deco.buff === 'max_bet') {
                maxBet += deco.value;
            }
        });
    }

    return maxBet;
}

/**
 * Checks for a police raid during gambling activities.
 * @param {object} message Discord message object.
 * @param {number} bet The amount currently bet.
 * @returns {Promise<boolean>} True if raid occurred, false otherwise.
 */
async function checkForGambleRaid(message, bet) {
    if (!bet || bet <= 0) return false;

    const { getCurrentEvent } = require('./eventSystem');
    const { getLanguage, t } = require('./i18n');
    const db = require('../database');
    const config = require('../config');

    const event = await getCurrentEvent(message.guild.id);
    const baseChance = config.ECONOMY.GAMBLE_RAID_BASE_CHANCE || 0.005;

    let chance = baseChance;
    let penaltyMulti = config.ECONOMY.GAMBLE_RAID_PENALTY || 2.5;

    if (event.id === 'police_raid') {
        chance *= (event.raidChanceMultiplier || 15.0);
        penaltyMulti *= (event.penaltyMultiplier || 1.5);
    }

    if (Math.random() < chance) {
        const penalty = Math.floor(bet * penaltyMulti);
        await db.removeBalance(message.guild.id, message.author.id, penalty);
        await addHouseProfit(message, penalty);

        const lang = await getLanguage(message.author.id, message.guild.id);
        const { EmbedBuilder } = require('discord.js');

        const embed = new EmbedBuilder()
            .setTitle('🚔 POLICE RAID!')
            .setDescription(t('gamble.raid_alert', lang, { amount: penalty.toLocaleString() }))
            .setColor(config.COLORS.ERROR)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        return true;
    }

    return false;
}

module.exports = { parseAmount, calculateNetWorth, addHouseProfit, getMaxBet, checkForGambleRaid };
