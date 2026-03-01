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

    const client = context.client || context;
    if (!client.user) return;

    const botId = client.user.id;
    const db = require('../database');
    const { addXp, assignRandomJob } = require('./leveling');
    const { getLanguage, t } = require('./i18n');
    const { EmbedBuilder } = require('discord.js');
    const config = require('../config');

    // Add balance to bot
    await db.addBalance(botId, amount);

    // Grant XP to bot: 1 XP per 10 profit (min 5, max 50)
    const xpAmount = Math.max(5, Math.min(50, Math.floor(amount / 10)));
    const { reachedLevel20 } = await addXp(botId, xpAmount);

    if (reachedLevel20) {
        const guildId = context.guild?.id || context.guildId || null;
        const lang = await getLanguage(botId, guildId);
        const job = await assignRandomJob(botId, guildId, lang);
        const channel = context.channel || (context.interaction && context.interaction.channel) || context.client?.channels?.cache?.get(context.channelId);

        if (channel && channel.send) {
            const embed = new EmbedBuilder()
                .setTitle(t('job.milestone_title', lang))
                .setDescription(`**${client.user.username}** ${t('job.milestone_desc', lang)}`)
                .addFields({
                    name: t('job.name_field', lang),
                    value: t('job.milestone_assigned', lang, {
                        job: job.name,
                        icon: job.config.icon,
                        fact: job.fact,
                        prefix: config.PREFIX
                    })
                })
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setColor(job.config.color || '#f1c40f')
                .setTimestamp();

            channel.send({ embeds: [embed] }).catch(() => { });
        }
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

module.exports = { parseAmount, calculateNetWorth, addHouseProfit, getMaxBet };
