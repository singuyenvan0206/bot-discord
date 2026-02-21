const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

// Rod Definitions (Ids must match locale keys in items block)
const RODS = [
    { id: '33', luck: 2.5 },
    { id: '26', luck: 1.5 },
    { id: '11', luck: 1.0 } // Tier 1
];

// Bait Definitions
const BAITS = [
    { id: '4', luck: 0.8 },
    { id: '3', luck: 0.3 },
    { id: '2', luck: 0.1 }
];

// Fish Table
const CATCHES = [
    { key: 'old_boot', emoji: '👢', value: 0, weight: 20, minLuck: 0 },
    { key: 'rusty_can', emoji: '🥫', value: 0, weight: 20, minLuck: 0 },
    { key: 'seaweed', emoji: '🌿', value: 5, weight: 15, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 30, weight: 20, minLuck: 0 },
    { key: 'brook_trout', emoji: '🐟', value: 50, weight: 15, minLuck: 0 },
    { key: 'bass', emoji: '🐟', value: 75, weight: 10, minLuck: 1.0 },
    { key: 'sockeye_salmon', emoji: '🐟', value: 100, weight: 10, minLuck: 1.2 },
    { key: 'tuna', emoji: '🐟', value: 250, weight: 8, minLuck: 1.5 },
    { key: 'pufferfish', emoji: '🐡', value: 150, weight: 12, minLuck: 1.0 },
    { key: 'clownfish', emoji: '🐠', value: 200, weight: 8, minLuck: 1.2 },
    { key: 'swordfish', emoji: '🗡️', value: 500, weight: 5, minLuck: 1.8 },
    { key: 'shark', emoji: '🦈', value: 1000, weight: 3, minLuck: 2.0 },
    { key: 'whale', emoji: '🐋', value: 2500, weight: 2, minLuck: 2.5 },
    { key: 'treasure_chest', emoji: '💰', value: 5000, weight: 1, minLuck: 1.5 },
    { key: 'kraken', emoji: '🐙', value: 10000, weight: 0.5, minLuck: 3.0 }
];

module.exports = {
    name: 'fish',
    aliases: ['f', 'fishing', 'cast'],
    description: 'Đi câu cá! Đòi hỏi phải có cần câu và mồi.',
    cooldown: 15,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const inventory = JSON.parse(user.inventory || '{}');

        // 1. Check for Rod (Use Best)
        let rod = null;
        for (const r of RODS) {
            if (inventory[r.id]) {
                rod = r;
                break;
            }
        }

        if (!rod) {
            return message.reply(t('fish.rod_needed', lang, { prefix: config.PREFIX }));
        }

        // 2. Check for Bait (Use Best)
        let bait = null;
        for (const b of BAITS) {
            if (inventory[b.id] && inventory[b.id] > 0) {
                bait = b;
                break;
            }
        }

        if (!bait) {
            return message.reply(t('fish.bait_needed', lang, { prefix: config.PREFIX }));
        }

        // Catch the names from items block
        const rodName = t(`items.${rod.id}.name`, lang);
        const baitName = t(`items.${bait.id}.name`, lang);

        // 3. Consume Bait
        db.removeItem(message.author.id, bait.id, 1);

        // 4. Calculate Total Luck (Farmer Job Bonus)
        let totalLuck = rod.luck + bait.luck;
        if (user.job === 'farmer') {
            totalLuck *= 1.5; // Farmers get 50% more luck from gear
        }

        // 5. Determine Catch
        let pool = CATCHES.filter(c => c.minLuck <= totalLuck);

        let weightedPool = pool.map(c => {
            let modWeight = c.weight;
            if (totalLuck > 2.0 && c.value > 500) modWeight *= 2;
            if (totalLuck > 3.0 && c.value > 1000) modWeight *= 3;
            if (totalLuck > 2.0 && c.value === 0) modWeight *= 0.5;
            return { ...c, weight: modWeight };
        });

        // Weighted Random
        let totalWeight = 0;
        for (const c of weightedPool) totalWeight += c.weight;

        let random = Math.random() * totalWeight;
        let caughtItem = null;

        for (const c of weightedPool) {
            random -= c.weight;
            if (random <= 0) {
                caughtItem = c;
                break;
            }
        }
        if (!caughtItem) caughtItem = weightedPool[0];

        const caughtName = t(`fish.items.${caughtItem.key}`, lang);

        // 6. Respond
        const embed = new EmbedBuilder()
            .setTitle(t('fish.title', lang))
            .setColor(caughtItem.value > 0 ? config.COLORS.INFO : config.COLORS.NEUTRAL)
            .setDescription(t('fish.description', lang, { rod: rodName, bait: baitName }))
            .addFields(
                { name: t('fish.caught', lang), value: `${caughtItem.emoji} **${caughtName}**`, inline: true },
                { name: t('fish.income', lang), value: `${config.EMOJIS.COIN} **+${caughtItem.value.toLocaleString()}**`, inline: true },
                { name: t('fish.luck', lang), value: `✨ ${totalLuck.toFixed(1)}x`, inline: true }
            );

        if (caughtItem.value > 0) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(message.author.id, 'income');
            const bonus = Math.floor(caughtItem.value * multiplier);
            const totalValue = caughtItem.value + bonus;

            db.addBalance(message.author.id, totalValue);

            if (bonus > 0) {
                embed.addFields({ name: t('fish.item_bonus', lang), value: t('fish.bonus_percent', lang, { amount: bonus.toLocaleString(), percent: Math.round(multiplier * 100) }), inline: true });
            }

            embed.setFooter({ text: t('fish.footer_success', lang, { bait: baitName }) });

            // Add XP for success
            const xpGained = Math.floor(Math.random() * 21) + 20; // 20-40 XP
            const xpResult = addXp(message.author.id, xpGained);

            await message.reply({ embeds: [embed] });
            await checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
        } else {
            embed.setFooter({ text: t('fish.footer_fail', lang) });
            const xpResult = addXp(message.author.id, 5); // 5 XP for fail

            await message.reply({ embeds: [embed] });
            await checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
        }

        const { startCooldown } = require('../../utils/cooldown');
        startCooldown(message.client, 'fish', message.author.id);
    }
};
