const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const config = require('../../config');

module.exports = {
    name: 'inventory',
    aliases: ['inv'],
    description: 'Xem túi đồ của bạn',
    async execute(message, args) {
        const userData = db.getUser(message.author.id);
        const inv = JSON.parse(userData.inventory || '{}');

        if (Object.keys(inv).length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setTitle(`🎒  Túi đồ: ${message.author.username}`)
                .setDescription('*Túi đồ của bạn đang trống. Hãy ghé thăm `$shop` để mua sắm nhé!*'.replace('$', config.PREFIX))
                .setColor(config.COLORS.INFO);
            return message.reply({ embeds: [emptyEmbed] });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎒  Túi đồ: ${message.author.username}`)
            .setColor(config.COLORS.INFO)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        // Categorize items
        const categories = {
            'tool': { name: '🎣 Công Cụ', items: [] },
            'bait': { name: '🪱 Mồi Câu', items: [] },
            'income': { name: '💼 Tăng Thu Nhập', items: [] },
            'daily': { name: '📅 Tăng Thưởng Hàng Ngày', items: [] },
            'gamble': { name: '🎲 May Mắn', items: [] },
            'other': { name: '📦 Khác', items: [] }
        };

        for (const [id, count] of Object.entries(inv)) {
            const item = SHOP_ITEMS.find(i => String(i.id) === id);
            if (item) {
                const cat = categories[item.type] || categories['other'];
                cat.items.push(`**${item.name}** x${count}`);
            } else {
                categories['other'].items.push(`**ID: ${id}** x${count}`);
            }
        }

        for (const cat of Object.values(categories)) {
            if (cat.items.length > 0) {
                embed.addFields({ name: cat.name, value: cat.items.join('\n'), inline: true });
            }
        }

        return message.reply({ embeds: [embed] });
    }
};
