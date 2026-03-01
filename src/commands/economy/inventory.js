const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'i', 'bag'],
    description: 'Túi đồ (View inventory)',
    usage: '[@user]',
    examples: ['', '@Simsimi'],
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const userData = await db.getUser(target.id, message.guild.id);
        const inv = JSON.parse(userData.inventory || '{}');

        const ITEMS_PER_PAGE = 10;
        let currentCategory = 'summary';
        let currentPage = 0;

        const getCategories = () => {
            const cats = {
                'summary': { name: t('inventory.info', lang), items: [] },
                'tool': { name: t('inventory.categories.tool', lang), items: [] },
                'bait': { name: t('inventory.categories.bait', lang), items: [] },
                'income': { name: t('inventory.categories.income', lang), items: [] },
                'daily': { name: t('inventory.categories.daily', lang), items: [] },
                'gamble': { name: t('inventory.categories.gamble', lang), items: [] },
                'social': { name: t('inventory.categories.social', lang), items: [] },
                'other': { name: t('inventory.categories.other', lang), items: [] }
            };

            for (const [id, count] of Object.entries(inv)) {
                const item = SHOP_ITEMS.find(i => String(i.id) === id);
                if (item) {
                    const itemName = t(`items.${item.id}.name`, lang);
                    const catKey = item.type === 'xpboost' || item.type === 'robshield' ? 'other' : item.type;
                    cats[catKey]?.items.push(`**${itemName}** x${count} (ID: \`${id}\`)`);
                } else {
                    cats['other'].items.push(`**Unknown ID: ${id}** x${count}`);
                }
            }
            return cats;
        };

        const generateEmbed = async (category, page) => {
            const categories = getCategories();
            const title = t('inventory.title', lang, { user: target.username });
            const embed = new EmbedBuilder()
                .setAuthor({ name: title, iconURL: target.displayAvatarURL({ dynamic: true, size: 256 }) })
                .setColor(config.COLORS.INFO)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .setTimestamp();

            if (category === 'summary') {
                let totalItems = 0;
                let totalValue = 0;
                for (const [id, count] of Object.entries(inv)) {
                    totalItems += count;
                    const item = SHOP_ITEMS.find(i => String(i.id) === id);
                    if (item) totalValue += (item.price * count);
                }

                embed.addFields({
                    name: t('inventory.info', lang),
                    value: `${t('inventory.total_items', lang, { count: totalItems.toLocaleString() })}\n${t('inventory.inventory_value', lang, { emoji: config.EMOJIS.COIN, amount: totalValue.toLocaleString() })}`,
                    inline: true
                });

                // Global Multipliers (Capped 300% or 600%)
                const targetMember = message.guild.members.cache.get(target.id) || target;
                const { getTotalMultiplier, getXpMultiplier, getDynamicCap } = require('../../utils/multiplier');
                const incomeBonus = Math.round(await getTotalMultiplier(targetMember, 'income') * 100);
                const gambleBonus = Math.round(await getTotalMultiplier(targetMember, 'gamble') * 100);
                const xpBonus = Math.round((await getXpMultiplier(targetMember) - 1.0) * 100);
                const maxCapPercent = Math.round(await getDynamicCap(targetMember) * 100);

                embed.addFields({
                    name: t('inventory.global_multipliers', lang),
                    value: `**${t('inventory.income_bonus', lang)}:** +${incomeBonus}% / ${maxCapPercent}%\n**${t('inventory.gamble_bonus', lang)}:** +${gambleBonus}% / ${maxCapPercent}%\n**${t('inventory.xp_bonus', lang)}:** +${xpBonus}% / 400%`,
                    inline: true
                });

                // Active Buffs — aggregated by type
                let activeBuffs = [];
                try { activeBuffs = JSON.parse(userData.active_buffs || '[]'); } catch (e) { }
                const now = Math.floor(Date.now() / 1000);
                const validBuffs = activeBuffs.filter(b => b.expiresAt > now);

                if (validBuffs.length > 0) {
                    // Group by type: { type -> { total, earliestExpiry, count } }
                    const typeMap = {};
                    for (const b of validBuffs) {
                        const item = SHOP_ITEMS.find(i => i.id === b.itemId);
                        if (!item) continue;

                        const type = item.type;
                        let multiplier = item.multiplier;
                        // Special cases
                        if (item.id === 502) multiplier = 1.0; // XP Boost Potion: +100% XP
                        if (item.id === 501) multiplier = 1.0; // Shield of Protection: 100% Protection

                        if (!typeMap[type]) {
                            typeMap[type] = { total: 0, earliestExpiry: b.expiresAt, count: 0 };
                        }
                        typeMap[type].total += multiplier;
                        typeMap[type].count += 1;
                        if (b.expiresAt < typeMap[type].earliestExpiry) {
                            typeMap[type].earliestExpiry = b.expiresAt;
                        }
                    }

                    // Diminishing returns + Hard Cap 2.5
                    const effectiveTotal = (raw) => {
                        const eff = raw > 1.0 ? 1.0 + (raw - 1.0) * 0.5 : raw;
                        return Math.min(eff, 2.5);
                    };

                    const TYPE_EMOJIS = {
                        daily: '📅', income: '💼', gamble: '🎲',
                        xpboost: '✨', robshield: '🛡️', bait: '🪱', tool: '🎣', other: '📦'
                    };

                    const lines = Object.entries(typeMap).map(([type, data]) => {
                        const effectType = t(`effects.${type}`, lang);
                        const pct = Math.round(data.total * 100);
                        const remaining = data.earliestExpiry - now;
                        let h = Math.floor(remaining / 3600);
                        let m = Math.round((remaining % 3600) / 60);
                        if (m === 60) { h += 1; m = 0; }
                        const timeStr = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
                        const emoji = TYPE_EMOJIS[type] || '⚡';
                        const countNote = data.count > 1 ? ` ×${data.count}` : '';
                        return `${emoji} **${effectType}:** +${pct}%${countNote} ${t('common.next_expiry', lang, { time: timeStr })}`;
                    });

                    embed.addFields({
                        name: `⚡ ${t('inventory.active_buffs', lang)}`,
                        value: lines.join('\n') || '\u200b',
                        inline: false
                    });
                } else {
                    embed.addFields({ name: `⚡ ${t('inventory.active_buffs', lang)}`, value: t('common.none', lang), inline: false });
                }

                if (totalItems === 0) {
                    embed.setDescription(t('inventory.empty', lang, { prefix: config.PREFIX }));
                } else {
                    // Set a default description if empty not called, to avoid BASE_TYPE_REQUIRED error
                    embed.setDescription('\u200b');
                }

            } else {
                const cat = categories[category];
                const items = cat.items;
                const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
                const start = page * ITEMS_PER_PAGE;
                const currentItems = items.slice(start, start + ITEMS_PER_PAGE);

                embed.setTitle(cat.name);
                embed.setDescription(currentItems.length > 0 ? currentItems.join('\n') : t('shop.empty', lang));
                if (totalPages > 1) embed.setFooter({ text: `Page ${page + 1}/${totalPages}` });
            }

            return embed;
        };

        const generateComponents = (category, page) => {
            const categories = getCategories();
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('inv_summary').setLabel('📊').setStyle(category === 'summary' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('inv_tool').setLabel('🎣').setStyle(category === 'tool' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(categories.tool.items.length === 0),
                new ButtonBuilder().setCustomId('inv_income').setLabel('💼').setStyle(category === 'income' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(categories.income.items.length === 0),
                new ButtonBuilder().setCustomId('inv_gamble').setLabel('🎲').setStyle(category === 'gamble' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(categories.gamble.items.length === 0),
                new ButtonBuilder().setCustomId('inv_social').setLabel('💞').setStyle(category === 'social' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(categories.social.items.length === 0)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('inv_other').setLabel('📦').setStyle(category === 'other' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(categories.other.items.length === 0)
            );

            const components = [row1, row2];

            if (category !== 'summary') {
                const items = categories[category].items;
                const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                if (totalPages > 1) {
                    const rowNav = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                        new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1)
                    );
                    components.push(rowNav);
                }
            }

            return components;
        };

        const initialReply = await message.reply({
            embeds: [await generateEmbed(currentCategory, currentPage)],
            components: generateComponents(currentCategory, currentPage)
        });

        const collector = initialReply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            if (i.customId.startsWith('inv_')) {
                currentCategory = i.customId.replace('inv_', '');
                currentPage = 0;
            } else if (i.customId === 'prev') {
                currentPage = Math.max(0, currentPage - 1);
            } else if (i.customId === 'next') {
                const categories = getCategories();
                const totalPages = Math.ceil(categories[currentCategory].items.length / ITEMS_PER_PAGE);
                currentPage = Math.min(totalPages - 1, currentPage + 1);
            }

            await i.update({
                embeds: [await generateEmbed(currentCategory, currentPage)],
                components: generateComponents(currentCategory, currentPage)
            }).catch(e => { /* Ignore Interaction Failed errors (e.g., timeout) */ });
        });

        collector.on('end', () => {
            initialReply.edit({ components: [] }).catch(() => { });
        });
    }
};
