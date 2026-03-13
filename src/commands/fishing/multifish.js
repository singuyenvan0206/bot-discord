const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { CATCHES, getWeightedPool, calculateFishingLuck, RODS, BAITS } = require('../../utils/fishData');
const { t, getLanguage } = require('../../utils/i18n');
const { calculateReward, getXpMultiplier } = require('../../utils/multiplier');
const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
const config = require('../../config');
const path = require('path');

module.exports = {
    name: 'multifish',
    aliases: ['mf'],
    description: 'Thực hiện câu cá nhiều lần (Perform multiple fishing attempts)',
    cooldown: 1800,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const user = await db.getUser(message.author.id, message.guild.id);
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

        const maxCount = 100; // Increased to 100 as requested
        let requestedCount;
        
        if (args[0]?.toLowerCase() === 'all') {
            requestedCount = inventory[bait.id] || 0;
        } else {
            requestedCount = Math.max(1, parseInt(args[0]) || 1);
        }

        const count = Math.min(maxCount, requestedCount, inventory[bait.id] || 0);

        if (count < 1) {
            return message.reply(t('common.insufficient_items', lang, { item: t(`items.${bait.id}.name`, lang) }));
        }

        if (requestedCount > count && inventory[bait.id] < requestedCount) {
             message.reply({ content: `⚠️ Bạn chỉ có ${inventory[bait.id]} mồi, bot sẽ thực hiện ${inventory[bait.id]} lần câu.`, ephemeral: true }).catch(() => {});
        }

        // Set cooldown manually after checks passed
        const timestamps = message.client.cooldowns.get('multifish');
        if (timestamps) timestamps.set(message.author.id, Date.now());

        // 3. Consume Bait (with Farmer chance)
        let baitsToConsume = 0;
        for (let i = 0; i < count; i++) {
            if (user.job === 'farmer' && Math.random() < 0.10) continue;
            baitsToConsume++;
        }

        if (baitsToConsume > 0) {
            await db.removeItem(message.guild.id, message.author.id, bait.id, baitsToConsume);
        }

        // Setup for fishing
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

        const xpMin = XP_AMOUNTS.COMMAND_SUCCESS.min;
        const xpMax = XP_AMOUNTS.COMMAND_SUCCESS.max;

        let totalCoins = 0;
        let catchesSummary = {};
        let rareCatches = [];
        let ledger = {};
        let activeBuffs = [];
        try { activeBuffs = JSON.parse(user.active_buffs || '[]'); } catch { activeBuffs = []; }
        let buffsCaughtCount = 0;
        let totalXP = 0;
        try { ledger = JSON.parse(user.fish_ledger || '{}'); } catch { ledger = {}; }

        for (let i = 0; i < count; i++) {
            const baseXP = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
            totalXP += baseXP;
            let random = Math.random() * totalWeight;
            let caughtItem = pool[0];

            for (const c of pool) {
                random -= c.weight;
                if (random <= 0) {
                    caughtItem = c;
                    break;
                }
            }

            if (!catchesSummary[caughtItem.key]) {
                catchesSummary[caughtItem.key] = { count: 0, emoji: caughtItem.emoji, value: caughtItem.value };
            }
            catchesSummary[caughtItem.key].count++;

            if (!ledger[caughtItem.key]) {
                ledger[caughtItem.key] = { count: 0, firstCaught: Math.floor(Date.now() / 1000) };
            }
            ledger[caughtItem.key].count++;
            ledger[caughtItem.key].lastCaught = Math.floor(Date.now() / 1000);

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

            if (caughtItem.value > 0) {
                let baseValue = caughtItem.value;
                if (user.job === 'farmer' && (inventory['409'] || inventory['411'] || inventory['412'] || inventory['413']) && Math.random() < 0.10) {
                    baseValue *= 1.5;
                }
                const { total } = await calculateReward(baseValue, message.member, 'income', { category: 'fish' });
                totalCoins += total;

                if (caughtItem.value >= 1000000) {
                    rareCatches.push(`${caughtItem.emoji} **${caughtItem.key}**`);
                }
            }
        }

        await db.updateUser(message.guild.id, message.author.id, {
            fish_ledger: JSON.stringify(ledger),
            active_buffs: JSON.stringify(activeBuffs)
        });
        await db.addBalance(message.guild.id, message.author.id, totalCoins);
        const xpResult = await addXp(message.member, totalXP, message.guild.id, true);
        const finalDisplayedXP = xpResult.addedXp || totalXP;

        const topCatches = Object.entries(catchesSummary)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([key, data]) => `${data.emoji} \`x${data.count}\` **${t(`fish.items.${key}`, lang)}**`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTitle(`🎣 Kết quả Câu cá x${count}`)
            .setColor(config.COLORS.SUCCESS)
            .addFields(
                { name: '💰 Tổng thu nhập', value: `\`${totalCoins.toLocaleString()}\` ${config.EMOJIS.COIN}`, inline: true },
                { name: '✨ XP Nhận được', value: `\`+${finalDisplayedXP.toLocaleString()}\` XP`, inline: true },
                { name: '✨ May mắn', value: `\`${totalLuck.toFixed(2)}x\``, inline: true },
                { name: '📊 Chiến lợi phẩm chính', value: topCatches || 'None', inline: false }
            );

        if (rareCatches.length > 0) {
            embed.addFields({ name: '🌟 Hàng hiếm', value: Array.from(new Set(rareCatches)).join(', '), inline: false });
        }

        if (buffsCaughtCount > 0) {
            embed.addFields({ name: '✨ Hiệu ứng nhận được', value: `\`x${buffsCaughtCount}\` hiệu ứng đặc biệt đã được cộng dồn!`, inline: false });
        }

        const savedBaits = count - baitsToConsume;
        if (savedBaits > 0) {
            embed.setFooter({ text: `Tiết kiệm được ${savedBaits} mồi nhờ kỹ năng Nông dân!` });
        }

        return message.reply({ embeds: [embed] });
    }
};
