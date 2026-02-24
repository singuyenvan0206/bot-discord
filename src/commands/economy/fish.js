const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { getLevelMultiplier } = require('../../utils/leveling');
const { getUserMultiplier, getTotalIncomeMultiplier, hasActiveItem } = require('../../utils/multiplier');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

// Rod Definitions (IDs match new category 400s)
const RODS = [
    { id: '407', luck: 4.0 },  // Titanium Rod
    { id: '406', luck: 2.5 },  // Carbon Rod
    { id: '405', luck: 1.5 },  // Fiberglass Rod
    { id: '404', luck: 1.0 }   // Bamboo Rod
];

// Bait Definitions
const BAITS = [
    { id: '403', luck: 0.8 },  // Squid Bait
    { id: '402', luck: 0.3 },  // Cricket Bait
    { id: '401', luck: 0.1 }   // Worm Bait
];

// Fish Table
const CATCHES = [
    { key: 'old_boot', emoji: '👢', value: 0, weight: 20, minLuck: 0 },
    { key: 'rusty_can', emoji: '🥫', value: 0, weight: 20, minLuck: 0 },
    { key: 'seaweed', emoji: '🌿', value: 10, weight: 15, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 100, weight: 20, minLuck: 0 },
    { key: 'brook_trout', emoji: '🐟', value: 250, weight: 15, minLuck: 0 },
    { key: 'bass', emoji: '🐟', value: 500, weight: 10, minLuck: 0.8 },
    { key: 'sockeye_salmon', emoji: '🐟', value: 800, weight: 10, minLuck: 1.0 },
    { key: 'pufferfish', emoji: '🐡', value: 1200, weight: 12, minLuck: 1.2 },
    { key: 'clownfish', emoji: '🐠', value: 2000, weight: 8, minLuck: 1.5 },
    { key: 'stingray', emoji: '🐡', value: 5000, weight: 5, minLuck: 1.8 },
    { key: 'tuna', emoji: '🐟', value: 7500, weight: 8, minLuck: 2.0 },
    { key: 'swordfish', emoji: '🗡️', value: 15000, weight: 5, minLuck: 2.2 },
    { key: 'manta_ray', emoji: '🐋', value: 25000, weight: 4, minLuck: 2.5 },
    { key: 'shark', emoji: '🦈', value: 40000, weight: 3, minLuck: 2.8 },
    { key: 'whale', emoji: '🐋', value: 75000, weight: 2, minLuck: 3.2 },
    { key: 'anglerfish', emoji: '🏮', value: 150000, weight: 1.5, minLuck: 3.5 },
    { key: 'treasure_chest', emoji: '💰', value: 250000, weight: 1, minLuck: 3.0 },
    { key: 'mythical_pearl', emoji: '🔮', value: 500000, weight: 0.5, minLuck: 4.0 },
    { key: 'kraken', emoji: '🐙', value: 1000000, weight: 0.3, minLuck: 4.5 },
    { key: 'megalodon', emoji: '🦈', value: 2000000, weight: 0.1, minLuck: 5.0 },
    { key: 'poseidon_trident', emoji: '🔱', value: 5000000, weight: 0.05, minLuck: 5.5 }
];

module.exports = {
    name: 'fish',
    aliases: ['f', 'fishing', 'cast'],
    description: 'Đi câu cá! Đòi hỏi phải có cần câu và mồi.',
    cooldown: config.ECONOMY.FISH_COOLDOWN,
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
        let baitSaved = false;
        if (user.job === 'farmer' && Math.random() < 0.25) {
            baitSaved = true;
        }

        if (!baitSaved) {
            db.removeItem(message.author.id, bait.id, 1);
        }

        // 4. Calculate Total Luck (Farmer Job Bonus)
        let totalLuck = rod.luck * (1 + bait.luck);
        if (user.job === 'farmer') {
            totalLuck *= 1.5; // Farmers get 50% more luck from gear
        }

        // 5. Determine Catch
        let pool = CATCHES.filter(c => c.minLuck <= totalLuck);

        let weightedPool = pool.map(c => {
            let modWeight = c.weight;
            if (totalLuck > 2.0 && c.value > 500) modWeight *= 1.5;
            if (totalLuck > 3.0 && c.value > 1000) modWeight *= 2;
            if (totalLuck > 2.0 && c.value === 0) modWeight *= 0.7;
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
        let description = t('fish.description', lang, { rod: rodName, bait: baitName });
        if (baitSaved) {
            description += t('fish.bait_salvaged', lang);
        }

        const embed = new EmbedBuilder()
            .setTitle(t('fish.title', lang))
            .setColor(caughtItem.value > 0 ? config.COLORS.INFO : config.COLORS.NEUTRAL)
            .setDescription(description)
            .addFields(
                { name: t('fish.caught', lang), value: `${caughtItem.emoji} **${caughtName}**`, inline: true },
                { name: t('fish.income', lang), value: `${config.EMOJIS.COIN} **+${caughtItem.value.toLocaleString()}**`, inline: true },
                { name: t('fish.luck', lang), value: `✨ ${totalLuck.toFixed(1)}x`, inline: true }
            );

        if (caughtItem.value > 0) {
            const { calculateReward } = require('../../utils/multiplier');

            let baseValue = caughtItem.value;
            let trophyMsg = '';

            // Farmer Interaction: Trophy Fish (15% chance for 2x if using Fiberglass/Carbon/Titanium)
            if (user.job === 'farmer' && (hasActiveItem(message.author.id, 405) || hasActiveItem(message.author.id, 406) || hasActiveItem(message.author.id, 407)) && Math.random() < 0.15) {
                baseValue *= 2;
                trophyMsg = t('fish.trophy_catch', lang);
            }

            const { total: totalValue, bonus: bonusAmount } = calculateReward(baseValue, message.author.id);

            db.addBalance(message.author.id, totalValue);

            if (trophyMsg) {
                embed.addFields({ name: '🏆 Achievement', value: trophyMsg, inline: false });
            }

            // Update income field to show total
            embed.spliceFields(1, 1, { name: t('fish.income', lang), value: `${config.EMOJIS.COIN} **+${totalValue.toLocaleString()}**`, inline: true });

            if (bonusAmount > 0) {
                embed.addFields({
                    name: t('fish.item_bonus', lang, { amount: bonusAmount.toLocaleString(), emoji: config.EMOJIS.COIN }),
                    value: t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString() })
                });
            }

            embed.setFooter({ text: t('fish.footer_success', lang, { bait: baitName }) });



            return message.reply({ embeds: [embed] });
        } else {
            embed.setFooter({ text: t('fish.footer_fail', lang) });
            return message.reply({ embeds: [embed] });
        }

        startCooldown(message.client, 'fish', message.author.id);
    }
};
