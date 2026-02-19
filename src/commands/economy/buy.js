const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'buy',
    aliases: ['b'],
    description: 'Buy an item from the shop',
    async execute(message, args) {
        const itemId = args[0]?.toLowerCase();
        if (!itemId) return message.reply('❌ Please specify an item ID to buy (e.g., `!buy laptop`).');

        const item = SHOP_ITEMS.find(i => i.id === itemId);
        const user = db.getUser(message.author.id);

        if (!item) return message.reply('❌ Item not found. Check `!shop` for IDs.');

        if (user.balance < item.price) {
            return message.reply(`❌ You need **${item.price}** coins to buy **${item.name}**!`);
        }

        db.removeBalance(message.author.id, item.price);
        db.addItem(message.author.id, item.id);

        let msg = `✅ You bought **${item.name}** for **${item.price}** coins! 🛍️`;
        if (item.multiplier) {
            msg += `\n✨ **Bonus Applied:** +${Math.round(item.multiplier * 100)}% effect!`;
        }
        return message.reply(msg);
    }
};
