const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { CATCHES, getWeightedPool, calculateFishingLuck } = require('../../utils/fishData');
const { calculateReward } = require('../../utils/multiplier');
const { t } = require('../../utils/i18n');
const config = require('../../config');
const path = require('path');

module.exports = {
    name: 'multifish',
    aliases: ['mf'],
    description: 'Perform multiple fishing attempts (Owner Only)',
    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) {
            return message.reply('❌ This command is restricted to the bot owner.');
        }

        const count = Math.min(100, Math.max(1, parseInt(args[0]) || 1));
        const user = await db.getUser(message.author.id, message.guild.id);
        const lang = 'vi'; // Default to vi for owner summary if not specified, or use getLanguage

        // Setup for fishing
        const rod = { id: '413', luck: 3.0 }; // Assume Neptune's Rod for max testing
        const bait = { id: '406', luck: 3.5 }; // Assume Golden Bait for max testing
        const event = await require('../../utils/eventSystem').getCurrentEvent(message.guild.id);
        let buffs = [];
        try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

        const totalLuck = calculateFishingLuck(user, rod, bait, event, buffs);
        const pool = getWeightedPool(totalLuck, user.job);
        const totalWeight = pool.reduce((acc, c) => acc + c.weight, 0);

        const SHOP_ITEMS = require('../../utils/shopItems');
        const mythicalItems = {
            'megalodon': { buff: 601 },
            'poseidon_trident': { buff: 602 },
            'mythical_pearl': { buff: 603 },
            'kraken': { buff: 604 },
            'thousand_year_turtle': { buff: 605 },
            'ocean_dragon': { buff: 606 },
            'galaxy_whale': { buff: 607 },
            'void_leviathan': { buff: 608 },
            'dragonfish': { buff: 615 },
            'phoenix_fish': { buff: 616 },
            'anglerfish': { buff: 617 },
            'treasure_chest': { buff: 618 }
        };

        let totalCoins = 0;
        let catchesSummary = {};
        let rareCatches = [];
        let ledger = {};
        let activeBuffs = [];
        try { activeBuffs = JSON.parse(user.active_buffs || '[]'); } catch { activeBuffs = []; }
        let buffsCaughtCount = 0;
        try { ledger = JSON.parse(user.fish_ledger || '{}'); } catch { ledger = {}; }

        for (let i = 0; i < count; i++) {
            let random = Math.random() * totalWeight;
            let caughtItem = pool[0];

            for (const c of pool) {
                random -= c.weight;
                if (random <= 0) {
                    caughtItem = c;
                    break;
                }
            }

            // Record catch
            if (!catchesSummary[caughtItem.key]) {
                catchesSummary[caughtItem.key] = { count: 0, emoji: caughtItem.emoji, value: caughtItem.value };
            }
            catchesSummary[caughtItem.key].count++;

            // Update Ledger
            if (!ledger[caughtItem.key]) {
                ledger[caughtItem.key] = { count: 0, firstCaught: Math.floor(Date.now() / 1000) };
            }
            ledger[caughtItem.key].count++;
            ledger[caughtItem.key].lastCaught = Math.floor(Date.now() / 1000);

            // Handle Buffs
            const mythical = mythicalItems[caughtItem.key];
            if (mythical || caughtItem.buff) {
                const buffId = caughtItem.buff || mythical.buff;
                const buffItem = SHOP_ITEMS.find(bi => bi.id === buffId);
                if (buffItem) {
                    const now = Math.floor(Date.now() / 1000);
                    let existing = activeBuffs.find(b => b.itemId === buffItem.id);
                    if (existing) {
                        existing.expiresAt = Math.max(existing.expiresAt, now) + buffItem.duration;
                    } else {
                        activeBuffs.push({ itemId: buffItem.id, expiresAt: now + buffItem.duration });
                    }
                    buffsCaughtCount++;
                }
            }

            // Calculate Reward
            if (caughtItem.value > 0) {
                const { total } = await calculateReward(caughtItem.value, message.member, 'income');
                totalCoins += total;

                // Highlight Rares (Value > 1M)
                if (caughtItem.value >= 1000000) {
                    rareCatches.push(`${caughtItem.emoji} **${caughtItem.key}**`);
                }
            }
        }

        // Save Data
        await db.updateUser(message.guild.id, message.author.id, {
            fish_ledger: JSON.stringify(ledger),
            active_buffs: JSON.stringify(activeBuffs)
        });
        await db.addBalance(message.guild.id, message.author.id, totalCoins);

        // Build Summary
        const topCatches = Object.entries(catchesSummary)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([key, data]) => `${data.emoji} \`x${data.count}\` **${key}**`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`🎣 Multi-Fishing Results (x${count})`)
            .setColor(config.COLORS.SUCCESS)
            .addFields(
                { name: '💰 Total Earnings', value: `\`${totalCoins.toLocaleString()}\` ${config.EMOJIS.COIN}`, inline: true },
                { name: '✨ Luck Used', value: `\`${totalLuck.toFixed(2)}x\``, inline: true },
                { name: '📊 Top Catches', value: topCatches || 'None', inline: false }
            );

        if (rareCatches.length > 0) {
            embed.addFields({ name: '🌟 Rare Catches', value: Array.from(new Set(rareCatches)).join(', '), inline: false });
        }

        if (buffsCaughtCount > 0) {
            embed.addFields({ name: '✨ Buffs Granted', value: `\`x${buffsCaughtCount}\` special status effects stacked!`, inline: false });
        }

        embed.setFooter({ text: `Ledger updated for ${message.author.username}` });

        return message.reply({ embeds: [embed] });
    }
};
