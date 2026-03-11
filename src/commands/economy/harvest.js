const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');
const { CATCHES } = require('../../utils/fishData');

module.exports = {
    name: 'harvest',
    aliases: ['thuhoach', 'crop'],
    description: 'Thu hoạch mùa màng (Instant harvest) - Farmer Only',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);

        if (user.job !== 'farmer') {
            return message.reply(t('harvest.farmer_only', lang));
        }

        // Sync memory cooldown
        const timestamps = message.client.cooldowns.get('harvest');
        if (timestamps) timestamps.set(message.author.id, Date.now());

        const now = Math.floor(Date.now() / 1000);

        // Potential Rewards: 70% Coins, 30% Random Common/Rare Fish
        const isFish = Math.random() < 0.3;

        await db.updateUser(message.guild.id, message.author.id, { last_harvest: now });

        if (isFish) {
            const validFish = CATCHES.filter(f => f.value > 0 && f.value < 50000); // Common to Rare
            const prize = validFish[Math.floor(Math.random() * validFish.length)];

            // Update Ledger
            let ledger = {};
            try { ledger = JSON.parse(user.fish_ledger || '{}'); } catch { ledger = {}; }
            if (!ledger[prize.key]) ledger[prize.key] = { count: 0, firstCaught: now };
            ledger[prize.key].count += 1;
            ledger[prize.key].lastCaught = now;
            await db.updateUser(message.guild.id, message.author.id, { fish_ledger: JSON.stringify(ledger) });

            return message.reply(t('harvest.success_fish', lang, { emoji: prize.emoji, name: t(`fish.items.${prize.key}`, lang) || prize.key }));
        } else {
            const amount = 5000 + (user.level * 300);
            await db.addBalance(message.guild.id, message.author.id, amount);
            return message.reply(t('harvest.success_coins', lang, { amount: amount.toLocaleString(), emoji: config.EMOJIS.COIN }));
        }
    }
};
