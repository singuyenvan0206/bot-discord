const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const path = require('path');
const db = require('../../database');
const { getLevelMultiplier } = require('../../utils/leveling');
const { getUserMultiplier, getTotalIncomeMultiplier, hasActiveItem } = require('../../utils/multiplier');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const SHOP_ITEMS = require('../../utils/shopItems');
const { calculateReward } = require('../../utils/multiplier');
const { RODS, BAITS, CATCHES, getWeightedPool } = require('../../utils/fishData');


module.exports = {
    name: 'fish',
    aliases: ['f'],
    description: t('fish.command_desc', 'vi'),
    cooldown: config.ECONOMY.FISH_COOLDOWN,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
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

        // Catch the names from items block
        const rodName = t(`items.${rod.id}.name`, lang);
        const baitName = t(`items.${bait.id}.name`, lang);

        // Calculate Total Luck
        const event = await require('../../utils/eventSystem').getCurrentEvent();
        let buffs = [];
        try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

        const { calculateFishingLuck } = require('../../utils/fishData');
        const totalLuck = calculateFishingLuck(user, rod, bait, event, buffs);

        const weightedPool = getWeightedPool(totalLuck);
        const totalWeight = weightedPool.reduce((acc, c) => acc + c.weight, 0);

        // --- SUBCOMMAND: info ---
        // Fish info is now its own command: $fishinfo / $fi
        if (args[0] === 'info' || args[0] === 'i') {
            return message.reply(`ℹ️ Dùng lệnh \`${config.PREFIX}fishinfo\` (hoặc \`${config.PREFIX}fi\`) để xem danh sách cá!`);
        }



        // 3. Consume Bait
        let baitSaved = false;
        if (user.job === 'farmer' && Math.random() < 0.25) {
            baitSaved = true;
        }

        if (!baitSaved) {
            await db.removeItem(message.guild.id, message.author.id, bait.id, 1);
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

        // Special Effects for Mythical/Legendary Catches
        const mythicalItems = {
            'megalodon': { asset: 'megalodon.png', buff: 601, color: config.COLORS.GAMBLE_PUSH, announceKey: 'fish.mythical_announcement' },
            'poseidon_trident': { asset: 'poseidon_trident.png', buff: 602, color: 0x00D2FF, announceKey: 'fish.mythical_announcement' },
            'mythical_pearl': { asset: 'mythical_pearl.png', buff: 603, color: 0xFF00FF, announceKey: 'fish.mythical_pearl_announcement' },
            'kraken': { asset: 'kraken.png', buff: 604, color: 0xFF4500, announceKey: 'fish.kraken_announcement' },
            'thousand_year_turtle': { asset: 'thousand_year_turtle.png', buff: 605, color: 0x228B22, announceKey: 'fish.mythical_announcement' },
            'ocean_dragon': { asset: 'ocean_dragon.png', buff: 606, color: 0x1E90FF, announceKey: 'fish.mythical_announcement' },
            'dragonfish': { asset: 'dragonfish.png', color: 0xFFD700, announceKey: 'fish.legendary_announcement' },
            'phoenix_fish': { asset: 'phoenix_fish.png', color: 0xFF4500, announceKey: 'fish.legendary_announcement' },
            'anglerfish': { asset: 'anglerfish.png', color: 0x2F4F4F, announceKey: 'fish.legendary_announcement' },
            'treasure_chest': { asset: 'treasure_chest.png', color: 0xFFD700, announceKey: 'fish.legendary_announcement' },
            'galaxy_whale': { asset: 'galaxy_whale.png', buff: 607, color: 0x4B0082, announceKey: 'fish.mythical_announcement' },
            'void_leviathan': { asset: 'void_leviathan.png', buff: 608, color: 0x000000, announceKey: 'fish.mythical_announcement' }
        };

        const mythical = mythicalItems[caughtItem.key];
        if (mythical) {
            const isTrident = caughtItem.key === 'poseidon_trident';

            // 1. Visual Flair
            embed.setColor(mythical.color);
            if (isTrident) embed.setTitle(`🔱 ${t('fish.title', lang)} — ${t('fish.mythical_label', lang)}`);

            const assetName = mythical.asset;
            const assetPath = path.join(process.cwd(), 'src', 'assets', 'fishing', assetName);
            embed.setImage(`attachment://${assetName}`);

            // 2. Server-wide Announcement
            const announcement = t(mythical.announceKey, lang, { userId: message.author.id, item: caughtName });

            const announceEmbed = new EmbedBuilder()
                .setTitle(`🚨 ${t('fish.title', lang)} — ${caughtItem.key.toUpperCase().replace('_', ' ')} 🚨`)
                .setColor(mythical.color)
                .setDescription(announcement)
                .setImage(`attachment://${assetName}`)
                .setFooter({ text: t('fish.footer_success', lang, { bait: baitName }) });

            // Try to find a system/announcement channel, fallback to current channel
            const announceChannel = message.guild.channels.cache.find(c => c.name.includes('announcement') || c.name.includes('system') || c.name.includes('general')) || message.channel;

            if (announceChannel) {
                announceChannel.send({ embeds: [announceEmbed], files: [assetPath] }).catch(() => { });
            }

            // 3. Grant Buff
            const buffId = mythical?.buff || (isTrident ? 602 : 601);
            const buffItem = SHOP_ITEMS.find(i => i.id === buffId);
            if (buffItem) {
                let buffs = [];
                try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

                let duration = buffItem.duration;
                const expiresAt = Math.floor(Date.now() / 1000) + duration;

                buffs.push({ itemId: buffItem.id, expiresAt });
                await db.updateUser(message.guild.id, message.author.id, { active_buffs: JSON.stringify(buffs) });

                const buffName = t(`items.${buffId}.name`, lang);
                const buffDesc = t(`items.${buffId}.desc`, lang);
                embed.addFields({ name: `✨ ${buffName}`, value: buffDesc, inline: false });
            }
        }

        if (caughtItem.value > 0) {
            let baseValue = caughtItem.value;
            let trophyMsg = '';

            // Farmer Interaction: Trophy Fish (15% chance for 2x if possessing Fiberglass(409)/Carbon(411)/Titanium(412)/Neptune(413))
            if (user.job === 'farmer' && (inventory['409'] || inventory['411'] || inventory['412'] || inventory['413']) && Math.random() < 0.15) {
                baseValue *= 3;
                trophyMsg = t('fish.trophy_catch', lang);
            }

            const { total: totalValue, bonus: bonusAmount, percent } = await calculateReward(baseValue, message.member, 'income');

            await db.addBalance(message.guild.id, message.author.id, totalValue);

            if (trophyMsg) {
                embed.addFields({ name: '🏆 Achievement', value: trophyMsg, inline: false });
            }

            // Update income field to show total
            embed.spliceFields(1, 1, { name: t('fish.income', lang), value: `${config.EMOJIS.COIN} **+${totalValue.toLocaleString()}**`, inline: true });

            if (bonusAmount > 0) {
                embed.addFields({
                    name: t('fish.item_bonus', lang, { amount: bonusAmount.toLocaleString(), emoji: config.EMOJIS.COIN }),
                    value: t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent: percent.toLocaleString() })
                });
            }

            embed.setFooter({ text: t('fish.footer_success', lang, { bait: baitName }) });

            const replyOptions = { embeds: [embed] };
            if (caughtItem.key === 'megalodon' || caughtItem.key === 'poseidon_trident' ||
                caughtItem.key === 'mythical_pearl' || caughtItem.key === 'kraken' ||
                caughtItem.key === 'galaxy_whale' || caughtItem.key === 'void_leviathan' ||
                caughtItem.key === 'thousand_year_turtle' || caughtItem.key === 'ocean_dragon' ||
                caughtItem.key === 'dragonfish' || caughtItem.key === 'phoenix_fish' ||
                caughtItem.key === 'anglerfish' || caughtItem.key === 'treasure_chest') {
                const mythicalItems = {
                    'megalodon': 'megalodon.png',
                    'poseidon_trident': 'poseidon_trident.png',
                    'mythical_pearl': 'mythical_pearl.png',
                    'kraken': 'kraken.png',
                    'galaxy_whale': 'galaxy_whale.png',
                    'void_leviathan': 'void_leviathan.png',
                    'thousand_year_turtle': 'thousand_year_turtle.png',
                    'ocean_dragon': 'ocean_dragon.png',
                    'dragonfish': 'dragonfish.png',
                    'phoenix_fish': 'phoenix_fish.png',
                    'anglerfish': 'anglerfish.png',
                    'treasure_chest': 'treasure_chest.png'
                };
                const assetName = mythicalItems[caughtItem.key];
                replyOptions.files = [path.join(process.cwd(), 'src', 'assets', 'fishing', assetName)];
            }

            // Update Fish Ledger (Museum)
            if (caughtItem.value > 0) {
                let ledger = {};
                try { ledger = JSON.parse(user.fish_ledger || '{}'); } catch { ledger = {}; }

                const speciesKey = caughtItem.key;
                if (!ledger[speciesKey]) {
                    ledger[speciesKey] = { count: 0, firstCaught: Math.floor(Date.now() / 1000) };
                }
                ledger[speciesKey].count += 1;
                ledger[speciesKey].lastCaught = Math.floor(Date.now() / 1000);

                await db.updateUser(message.guild.id, message.author.id, { fish_ledger: JSON.stringify(ledger) });
            }

            startCooldown(message.client, 'fish', message.author.id);
            return message.reply(replyOptions);
        } else {
            embed.setFooter({ text: t('fish.footer_fail', lang) });
            startCooldown(message.client, 'fish', message.author.id);
            return message.reply({ embeds: [embed] });
        }
    }
};
