const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { getLevelMultiplier } = require('../../utils/leveling');
const { getUserMultiplier, getTotalIncomeMultiplier, hasActiveItem } = require('../../utils/multiplier');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

// Rod Definitions (IDs match new category 400s)
const RODS = [
    { id: '410', luck: 7.5 },  // Neptune's Rod
    { id: '407', luck: 5.0 },  // Titanium Rod
    { id: '406', luck: 3.5 },  // Carbon Rod
    { id: '409', luck: 2.5 },  // Steel Rod
    { id: '405', luck: 1.8 },  // Fiberglass Rod
    { id: '404', luck: 1.0 },  // Bamboo Rod
    { id: '408', luck: 0.5 }   // Plastic Rod
];

// Bait Definitions
const BAITS = [
    { id: '413', luck: 3.0 },  // Golden Bait
    { id: '403', luck: 1.5 },  // Squid Bait
    { id: '402', luck: 0.75 }, // Cricket Bait
    { id: '412', luck: 0.4 },  // Shrimp Bait
    { id: '401', luck: 0.15 }, // Worm Bait
    { id: '411', luck: 0.05 }  // Bread Bait
];

// Fish Table
const CATCHES = [
    { key: 'old_boot', emoji: '👢', value: 0, weight: 5, minLuck: 0 },
    { key: 'rusty_can', emoji: '🥫', value: 0, weight: 5, minLuck: 0 },
    { key: 'seaweed', emoji: '🌿', value: 5, weight: 10, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 50, weight: 10, minLuck: 0 },
    { key: 'brook_trout', emoji: '🐟', value: 120, weight: 50, minLuck: 0 },
    { key: 'bass', emoji: '🐟', value: 300, weight: 80, minLuck: 2.0 },
    { key: 'sockeye_salmon', emoji: '🐟', value: 500, weight: 80, minLuck: 4.0 },
    { key: 'pufferfish', emoji: '🐡', value: 800, weight: 75, minLuck: 6.0 },
    { key: 'clownfish', emoji: '🐠', value: 1200, weight: 70, minLuck: 8.0 },
    { key: 'stingray', emoji: '🐡', value: 2500, weight: 60, minLuck: 10.0 },
    { key: 'tuna', emoji: '🐟', value: 4000, weight: 50, minLuck: 12.0 },
    { key: 'swordfish', emoji: '🗡️', value: 8000, weight: 40, minLuck: 15.0 },
    { key: 'manta_ray', emoji: '🐋', value: 12000, weight: 20, minLuck: 18.0 },
    { key: 'shark', emoji: '🦈', value: 8000, weight: 15, minLuck: 20.0 },
    { key: 'whale', emoji: '🐋', value: 15000, weight: 10, minLuck: 22.0 },
    { key: 'anglerfish', emoji: '🏮', value: 30000, weight: 10, minLuck: 25.0 },
    { key: 'treasure_chest', emoji: '💰', value: 50000, weight: 10, minLuck: 28.0 },
    { key: 'mythical_pearl', emoji: '🔮', value: 80000, weight: 5, minLuck: 32.0 },
    { key: 'kraken', emoji: '🐙', value: 150000, weight: 2, minLuck: 35.0 },
    { key: 'megalodon', emoji: '🦈', value: 300000, weight: 1, minLuck: 38.0 },
    { key: 'poseidon_trident', emoji: '🔱', value: 600000, weight: 1, minLuck: 42.0 }
];

module.exports = {
    name: 'fish',
    aliases: ['f', 'fishing', 'cast'],
    description: 'Đi câu cá! Đòi hỏi phải có cần câu và mồi.',
    cooldown: config.ECONOMY.FISH_COOLDOWN,
    manualCooldown: true,
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

        // Calculate Total Luck (Farmer Job Bonus)
        let totalLuck = rod.luck * (1 + bait.luck);
        if (user.job === 'farmer') {
            totalLuck *= 1.5; // Farmers get 50% more luck from gear
        }

        // helper to get weighted pool
        const getWeightedPool = (luck) => {
            let pool = CATCHES.filter(c => c.minLuck <= luck);
            return pool.map(c => {
                let modWeight = c.weight;
                if (c.value < 100) {
                    // Junk and small fish decrease as luck increases
                    // At 50 luck, these reach minimum 5% of their base weight
                    modWeight *= Math.max(0.05, 1 - (luck / 50));
                } else {
                    // Rare items increase weight based on how much luck exceeds their minimum
                    // Using Power 1.2 to give a nice curve for higher luck levels
                    const luckDiff = luck - c.minLuck;
                    modWeight *= Math.pow(Math.max(1, luckDiff + 1), 1.2);
                }
                return { ...c, weight: modWeight };
            });
        };

        const weightedPool = getWeightedPool(totalLuck);
        const totalWeight = weightedPool.reduce((acc, c) => acc + c.weight, 0);

        // --- SUBCOMMAND: rates ---
        if (args[0] === 'rates') {
            const ratesEmbed = new EmbedBuilder()
                .setTitle(t('fish.rates_title', lang))
                .setColor(config.COLORS.INFO)
                .setDescription(t('fish.rates_desc', lang, { rod: rodName, bait: baitName, luck: totalLuck.toFixed(1) }));

            // Sort by value (rarity)
            const sortedPool = [...weightedPool].sort((a, b) => b.value - a.value);

            let ratesText = '';
            for (const item of sortedPool) {
                const chance = ((item.weight / totalWeight) * 100).toFixed(2);
                const itemName = t(`fish.items.${item.key}`, lang);
                ratesText += `${item.emoji} **${itemName}**: \`${chance}%\`\n`;
            }

            ratesEmbed.addFields({ name: t('common.choices', lang), value: ratesText });
            ratesEmbed.setFooter({ text: t('fish.rates_footer', lang, { prefix: config.PREFIX }) });

            return message.reply({ embeds: [ratesEmbed] });
        }

        // 3. Consume Bait
        let baitSaved = false;
        if (user.job === 'farmer' && Math.random() < 0.25) {
            baitSaved = true;
        }

        if (!baitSaved) {
            db.removeItem(message.author.id, bait.id, 1);
        }

        // 5. Determine Catch
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

            const { total: totalValue, bonus: bonusAmount, cap } = calculateReward(baseValue, message.author.id);

            db.addBalance(message.author.id, totalValue);

            if (trophyMsg) {
                embed.addFields({ name: '🏆 Achievement', value: trophyMsg, inline: false });
            }

            // Update income field to show total
            embed.spliceFields(1, 1, { name: t('fish.income', lang), value: `${config.EMOJIS.COIN} **+${totalValue.toLocaleString()}**`, inline: true });

            if (bonusAmount > 0) {
                embed.addFields({
                    name: t('fish.item_bonus', lang, { amount: bonusAmount.toLocaleString(), emoji: config.EMOJIS.COIN }),
                    value: t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), cap })
                });
            }

            embed.setFooter({ text: t('fish.footer_success', lang, { bait: baitName }) });

            startCooldown(message.client, 'fish', message.author.id);
            return message.reply({ embeds: [embed] });
        } else {
            embed.setFooter({ text: t('fish.footer_fail', lang) });
            startCooldown(message.client, 'fish', message.author.id);
            return message.reply({ embeds: [embed] });
        }
    }
};
