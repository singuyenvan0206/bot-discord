const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const SHOP_ITEMS = require('../../utils/shopItems');
const config = require('../../config');

module.exports = {
    name: 'shop',
    aliases: ['store', 'sh'],
    description: 'View items for sale',
    async execute(message, args) {
        const ITEMS_PER_PAGE = 5;
        let currentCategory = 'income';
        let currentPage = 0;

        const getCategoryItems = (cat) => {
            if (cat === 'tools') {
                return SHOP_ITEMS.filter(i => i.type === 'tool' || i.type === 'bait');
            }
            return SHOP_ITEMS.filter(i => i.type === cat);
        };

        const generateEmbed = (category, page) => {
            const items = getCategoryItems(category);
            const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentItems = items.slice(start, end);

            const itemsList = currentItems.length > 0 ? currentItems.map(i => {
                let desc = `*${i.description}*`;
                if (i.multiplier) {
                    desc += `\n✨ **Thưởng:** +${Math.round(i.multiplier * 100)}% hiệu ứng`;
                }
                return `**${i.name}** — ${config.EMOJIS.COIN} ${i.price.toLocaleString()}\n${desc}\nID: \`${i.id}\``;
            }).join('\n\n') : '*Hiện chưa có vật phẩm nào trong danh mục này.*';

            const categoryNames = {
                income: '💼 Tăng Thu Nhập',
                daily: '📅 Thưởng Hàng Ngày',
                gamble: '🎲 Tăng May Mắn',
                tools: '🎣 Dụng Cụ Câu Cá'
            };

            return new EmbedBuilder()
                .setTitle(`🛒  Cửa Hàng — ${categoryNames[category]}`)
                .setDescription(itemsList)
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.client.user.displayAvatarURL())
                .setFooter({ text: `Trang ${page + 1}/${totalPages} • Dùng ${config.PREFIX}buy <id> [số_lượng]` });
        };

        const generateComponents = (category, page) => {
            const items = getCategoryItems(category);
            const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

            const categoryRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('cat_income').setLabel('💼 Thu Nhập').setStyle(category === 'income' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cat_daily').setLabel('📅 Daily').setStyle(category === 'daily' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cat_gamble').setLabel('🎲 Cờ Bạc').setStyle(category === 'gamble' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('cat_tools').setLabel('🎣 Công Cụ').setStyle(category === 'tools' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

            const navRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1)
                );

            const components = [categoryRow];
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
                currentCategory = i.customId.split('_')[1];
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
