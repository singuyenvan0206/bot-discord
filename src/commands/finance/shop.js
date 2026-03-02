const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'shop',
    aliases: ['s', 'sh', 'store'],
    description: 'Mở cửa hàng vật phẩm và công cụ (Open the item and tools shop)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const ITEMS_PER_PAGE = 5;
        let currentCategory = 'income';
        let currentPage = 0;

        const getCategoryItems = (cat) => {
            let items;
            const buyableItems = SHOP_ITEMS.filter(i => !i.unbuyable);

            if (cat === 'tools') {
                items = buyableItems.filter(i => i.type === 'tool' || i.type === 'bait');
            } else if (cat === 'other') {
                items = buyableItems.filter(i => i.type === 'other' || i.type === 'xpboost' || i.type === 'robshield');
            } else {
                items = buyableItems.filter(i => i.type === cat);
            }
            return items.sort((a, b) => a.price - b.price);
        };

        const generateEmbed = (category, page) => {
            const items = getCategoryItems(category);
            const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentItems = items.slice(start, end);

            const itemsList = currentItems.length > 0 ? currentItems.map(i => {
                const name = t(`items.${i.id}.name`, lang);
                const description = t(`items.${i.id}.desc`, lang);

                let desc = `*${description}*`;
                if (i.multiplier && i.multiplier > 0) {
                    const percent = Math.round(i.multiplier * 100);
                    const effectName = t(`effects.${i.type}`, lang) || t('common.effect', lang);
                    desc += t('shop.bonus_label', lang, { percent, effect: effectName });
                }
                let durationExtra = '';
                if (i.duration) {
                    let timeStr = '';
                    if (i.duration >= 86400) {
                        timeStr = `${Math.floor(i.duration / 86400).toLocaleString()}${lang === 'vi' ? 'd' : 'd'}`;
                    } else if (i.duration >= 3600) {
                        timeStr = `${Math.floor(i.duration / 3600).toLocaleString()}${lang === 'vi' ? 'h' : 'h'}`;
                    } else {
                        timeStr = `${Math.floor(i.duration / 60).toLocaleString()}${lang === 'vi' ? 'm' : 'm'}`;
                    }
                    durationExtra = ` • ⏳ ${timeStr}`;
                }

                const displayId = i.numeric_id || i.id;
                return `**${name}** — ${config.EMOJIS.COIN} **${i.price.toLocaleString()}**${durationExtra}\n${desc}\nID: \`${displayId}\``;
            }).join('\n\n') : t('shop.empty', lang);

            const categoryName = t(`shop.categories.${category}`, lang);

            return new EmbedBuilder()
                .setTitle(t('shop.title', lang, { category: categoryName }))
                .setDescription(itemsList)
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setFooter({ text: t('shop.footer', lang, { page: page + 1, total: totalPages, prefix: config.PREFIX }) });
        };

        const generateComponents = (category, page) => {
            const items = getCategoryItems(category);
            const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

            const categoryRow1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('cat_income').setLabel(t('shop.labels.income', lang)).setStyle(category === 'income' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cat_daily').setLabel(t('shop.labels.daily', lang)).setStyle(category === 'daily' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cat_gamble').setLabel(t('shop.labels.gamble', lang)).setStyle(category === 'gamble' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cat_tools').setLabel(t('shop.labels.tools', lang)).setStyle(category === 'tools' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cat_social').setLabel(t('shop.labels.social', lang)).setStyle(category === 'social' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            const categoryRow2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('cat_other').setLabel(t('shop.labels.other', lang)).setStyle(category === 'other' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cat_crate').setLabel(t('shop.labels.crate', lang)).setStyle(category === 'crate' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            const navRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1)
                );

            const components = [categoryRow1, categoryRow2];
            if (totalPages > 1) components.push(navRow);

            return components;
        };

        const reply = await message.reply({
            embeds: [generateEmbed(currentCategory, currentPage)],
            components: generateComponents(currentCategory, currentPage)
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            if (i.customId.startsWith('cat_')) {
                currentCategory = i.customId.replace('cat_', ''); // Simplified to handle any 'cat_' prefix
                currentPage = 0; // Reset page on category switch
            } else if (i.customId === 'prev') {
                currentPage = Math.max(0, currentPage - 1);
            } else if (i.customId === 'next') {
                const items = getCategoryItems(currentCategory);
                const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                currentPage = Math.min(totalPages - 1, currentPage + 1);
            }

            await i.update({
                embeds: [generateEmbed(currentCategory, currentPage)],
                components: generateComponents(currentCategory, currentPage)
            });
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => { });
        });
    }
};
