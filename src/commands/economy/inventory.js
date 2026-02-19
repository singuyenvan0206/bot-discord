const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'inventory',
    aliases: ['inv'],
    description: 'View your inventory',
    async execute(message, args) {
        const userData = db.getUser(message.author.id);
        const inv = JSON.parse(userData.inventory || '{}');
        const lines = Object.entries(inv).map(([id, count]) => {
            const item = SHOP_ITEMS.find(i => i.id === id);
            const name = item ? item.name : id;
            return `**${name}**: ${count}`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`🎒  Inventory: ${message.author.username}`)
            .setDescription(lines.length > 0 ? lines.join('\n') : '*Your inventory is empty.*')
            .setColor(0x3498DB);
        return message.reply({ embeds: [embed] });
    }
};
