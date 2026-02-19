const { EmbedBuilder } = require('discord.js');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'shop',
    aliases: ['store', 'sh'],
    description: 'View items for sale',
    async execute(message, args) {
        const items = SHOP_ITEMS.map(i => {
            let desc = `*${i.description}*`;
            if (i.multiplier) {
                desc += `\n✨ **Bonus:** +${Math.round(i.multiplier * 100)}% effect`;
            }
            return `**${i.name}** — 💰 ${i.price}\n${desc}\nID: \`${i.id}\``;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('🛒  General Store')
            .setDescription(items)
            .setColor(0x9B59B6)
            .setFooter({ text: 'Use !buy <id> to purchase!' });
        return message.reply({ embeds: [embed] });
    }
};
