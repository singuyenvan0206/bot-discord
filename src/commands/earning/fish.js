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

// Rod Definitions (IDs match new category 400s)
const RODS = [
    { id: '413', luck: 7.5 },  // Neptune's Rod
    { id: '412', luck: 5.0 },  // Titanium Rod
    { id: '411', luck: 3.5 },  // Carbon Rod
    { id: '410', luck: 2.5 },  // Steel Rod
    { id: '409', luck: 1.8 },  // Fiberglass Rod
    { id: '408', luck: 1.0 },  // Bamboo Rod
    { id: '407', luck: 0.5 }   // Plastic Rod
];

// Bait Definitions
const BAITS = [
    { id: '406', luck: 3.0 },  // Golden Bait
    { id: '405', luck: 1.5 },  // Squid Bait
    { id: '404', luck: 0.75 }, // Cricket Bait
    { id: '403', luck: 0.4 },  // Shrimp Bait
    { id: '402', luck: 0.15 }, // Worm Bait
    { id: '401', luck: 0.05 }  // Bread Bait
];

// Fish Table
const CATCHES = [
    { key: 'old_boot', emoji: '👢', value: 0, weight: 30, minLuck: 0 },
    { key: 'rusty_can', emoji: '🥫', value: 0, weight: 30, minLuck: 0 },
    { key: 'seaweed', emoji: '🌿', value: 5, weight: 80, minLuck: 0 },
    { key: 'tilapia', emoji: '🐟', value: 30, weight: 100, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 50, weight: 100, minLuck: 0 },
    { key: 'carp', emoji: '🐟', value: 80, weight: 100, minLuck: 0 },
    { key: 'brook_trout', emoji: '🐟', value: 120, weight: 100, minLuck: 0 },
    { key: 'archerfish', emoji: '🐟', value: 300, weight: 110, minLuck: 1.0 },
    { key: 'betta', emoji: '🐠', value: 450, weight: 100, minLuck: 3.0 },
    { key: 'bass', emoji: '🐟', value: 1000, weight: 150, minLuck: 2.0 },
    { key: 'sockeye_salmon', emoji: '🐟', value: 1500, weight: 150, minLuck: 4.0 },
    { key: 'pufferfish', emoji: '🐡', value: 2500, weight: 180, minLuck: 6.0 },
    { key: 'clownfish', emoji: '🐠', value: 4000, weight: 170, minLuck: 8.0 },
    { key: 'arowana', emoji: '🐉', value: 5500, weight: 155, minLuck: 9.0 },
    { key: 'stingray', emoji: '🐡', value: 7500, weight: 160, minLuck: 10.0 },
    { key: 'sunfish', emoji: '☀️', value: 9000, weight: 150, minLuck: 11.0 },
    { key: 'tuna', emoji: '🐟', value: 12000, weight: 150, minLuck: 12.0 },
    { key: 'swordfish', emoji: '🗡️', value: 10000, weight: 130, minLuck: 15.0 },
    { key: 'sturgeon', emoji: '🐟', value: 12000, weight: 130, minLuck: 16.0 },
    { key: 'manta_ray', emoji: '🐋', value: 10000, weight: 120, minLuck: 18.0 },
    { key: 'shark', emoji: '🦈', value: 12000, weight: 110, minLuck: 20.0 },
    { key: 'alligator_gar', emoji: '🐊', value: 15000, weight: 100, minLuck: 21.0 },
    { key: 'whale', emoji: '🐋', value: 18000, weight: 90, minLuck: 22.0 },
    { key: 'anglerfish', emoji: '🏮', value: 22000, weight: 80, minLuck: 25.0 },
    { key: 'treasure_chest', emoji: '💰', value: 35000, weight: 60, minLuck: 28.0 },
    { key: 'mythical_pearl', emoji: '🔮', value: 80000, weight: 100, minLuck: 32.0 },
    { key: 'kraken', emoji: '🐙', value: 160000, weight: 80, minLuck: 35.0 },
    { key: 'megalodon', emoji: '🦈', value: 350000, weight: 120, minLuck: 38.0 },
    { key: 'thousand_year_turtle', emoji: '🐢', value: 500000, weight: 150, minLuck: 40.0 },
    { key: 'poseidon_trident', emoji: '🔱', value: 650000, weight: 180, minLuck: 42.0 },
    { key: 'ocean_dragon', emoji: '🐉', value: 1000000, weight: 150, minLuck: 45.0 }
];

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

                if (c.value < 5000) {
                    // Suppress common fish at high luck
                    modWeight *= Math.max(0.01, 1 - (luck / 60));
                } else if (c.value < 20000) {
                    // Mid-tier: boost
                    const luckDiff = Math.max(0, luck - c.minLuck);
                    modWeight *= 1 + (luckDiff * 0.01);
                } else {
                    // Rare items (>= 20000): cap drop rates to prevent hyperinflation
                    modWeight *= 0.028; // Drastically reduce base drop chance
                    const luckDiff = Math.max(0, luck - c.minLuck);
                    modWeight *= 1 + (luckDiff * 0.05); // Give a 5% relative boost per point of luck above requirement
                }
                return { ...c, weight: modWeight };
            });
        };

        const weightedPool = getWeightedPool(totalLuck);
        const totalWeight = weightedPool.reduce((acc, c) => acc + c.weight, 0);

        // --- SUBCOMMAND: info ---
        if (args[0] === 'info' || args[0] === 'i') {
            const ITEMS_PER_PAGE = 8;
            let currentPage = 0;
            if (args[1] && !isNaN(args[1])) {
                currentPage = Math.max(0, parseInt(args[1]) - 1);
            }

            const totalPages = Math.ceil(CATCHES.length / ITEMS_PER_PAGE);
            if (currentPage >= totalPages) currentPage = totalPages - 1;

            const generateInfoEmbed = (page) => {
                const start = page * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const currentItems = CATCHES.slice(start, end);

                const embed = new EmbedBuilder()
                    .setTitle(t('fish.info_title', lang))
                    .setColor(config.COLORS.INFO)
                    .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 512 }));

                let listText = '';
                for (const item of currentItems) {
                    const itemName = t(`fish.items.${item.key}`, lang);
                    listText += `${item.emoji} **${itemName}**\n`;
                    listText += `└ ${t('fish.info_value', lang, { value: item.value.toLocaleString() })} • ${t('fish.info_luck', lang, { luck: item.minLuck })}\n\n`;
                }

                embed.setDescription(listText);
                embed.setFooter({ text: t('fish.info_footer', lang, { page: page + 1, total: totalPages, prefix: config.PREFIX }) });
                return embed;
            };

            const generateButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('fish_info_prev')
                        .setLabel('◀️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('fish_info_next')
                        .setLabel('▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages - 1)
                );
            };

            const infoMsg = await message.reply({
                embeds: [generateInfoEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });

            const collector = infoMsg.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 60000,
                componentType: ComponentType.Button
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'fish_info_prev') currentPage--;
                if (i.customId === 'fish_info_next') currentPage++;

                await i.update({
                    embeds: [generateInfoEmbed(currentPage)],
                    components: [generateButtons(currentPage)]
                });
            });

            collector.on('end', () => {
                infoMsg.edit({ components: [] }).catch(() => { });
            });

            return;
        }

        // --- SUBCOMMAND: rates ---
        if (args[0] === 'rates' || args[0] === 'r') {
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
            'ocean_dragon': { asset: 'ocean_dragon.png', buff: 606, color: 0x1E90FF, announceKey: 'fish.mythical_announcement' }
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

                const isChef = user.job === 'chef';
                let duration = buffItem.duration;
                if (isChef) duration *= 2;
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
                    value: t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent })
                });
            }

            embed.setFooter({ text: t('fish.footer_success', lang, { bait: baitName }) });

            const replyOptions = { embeds: [embed] };
            if (caughtItem.key === 'megalodon' || caughtItem.key === 'poseidon_trident' ||
                caughtItem.key === 'mythical_pearl' || caughtItem.key === 'kraken') {
                const mythicalItems = { 'megalodon': 'megalodon.png', 'poseidon_trident': 'poseidon_trident.png', 'mythical_pearl': 'mythical_pearl.png', 'kraken': 'kraken.png' };
                const assetName = mythicalItems[caughtItem.key];
                replyOptions.files = [path.join(process.cwd(), 'src', 'assets', 'fishing', assetName)];
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
