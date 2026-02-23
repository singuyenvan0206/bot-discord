const SHOP_ITEMS = require('./shopItems');

/**
 * Parses a string amount into a number, supporting abbreviations (k, m, b) and shorthand like "all".
 */
function parseAmount(input, balance = 0) {
    if (typeof input === 'number') return Math.floor(input);
    if (!input || typeof input !== 'string') return 0;

    const str = input.toLowerCase().trim();
    if (str === 'all' || str === 'max' || str === 'a') return balance;

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
function addHouseProfit(context, amount) {
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
    db.addBalance(botId, amount);

    // Grant XP to bot: 1 XP per 10 profit (min 5, max 50)
    const xpAmount = Math.max(5, Math.min(50, Math.floor(amount / 10)));
    const { reachedLevel20 } = addXp(botId, xpAmount);

    if (reachedLevel20) {
        const guildId = context.guild?.id || (context.guildId && typeof context.guildId === 'string' ? context.guildId : null);
        const lang = getLanguage(botId, guildId);
        const job = assignRandomJob(botId, lang);
        const channel = context.channel || (context.interaction && context.interaction.channel) || context.client?.channels?.cache?.get(context.channelId);

        if (channel && channel.send) {
            const embed = new EmbedBuilder()
                .setTitle(t('job.milestone_title', lang))
                .setDescription(`**${client.user.username}** ${t('job.milestone_desc', lang)}`)
                .addFields({
                    name: t('job.name_field', lang) || "Nghề nghiệp",
                    value: t('job.milestone_assigned', lang, {
                        job: job.name,
                        icon: job.config.icon,
                        fact: job.fact,
                        prefix: config.PREFIX
                    })
                })
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setColor(job.config.color || '#f1c40f')
                .setTimestamp();

            channel.send({ embeds: [embed] }).catch(() => { });
        }
    }
}

module.exports = { parseAmount, calculateNetWorth, addHouseProfit };
