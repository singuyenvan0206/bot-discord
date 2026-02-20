const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const config = require('../../config');

module.exports = {
    name: 'inventory',
    aliases: ['inv'],
    description: 'View your inventory',
    async execute(message, args) {
        const userData = db.getUser(message.author.id);
        const inv = JSON.parse(userData.inventory || '{}');
        const lines = Object.entries(inv).map(([id, count]) => {
            const item = SHOP_ITEMS.find(i => String(i.id) === id);
            const name = item ? item.name : id;
            return `**${name}**: ${count}`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`🎒  Inventory: ${message.author.username}`)
            .setDescription(lines.length > 0 ? lines.join('\n') : '*Your inventory is empty.*')
            .setColor(config.COLORS.INFO);
        return message.reply({ embeds: [embed] });
    }
};
