const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'buy',
    aliases: ['b'],
    description: 'Buy an item from the shop',
    async execute(message, args) {
        const itemId = args[0]?.toLowerCase();
        let quantity = parseInt(args[1]);

        if (!itemId) return message.reply('❌ Please specify an item ID to buy (e.g., `!buy laptop`).');

        // Default to 1 if not specified or invalid
        if (isNaN(quantity) || quantity < 1) quantity = 1;

        const item = SHOP_ITEMS.find(i => i.id === itemId);
        const user = db.getUser(message.author.id);

        if (!item) return message.reply('❌ Item not found. Check `!shop` for IDs.');

        const totalPrice = item.price * quantity;

        if (user.balance < totalPrice) {
            return message.reply(`❌ You need **${totalPrice.toLocaleString()}** coins to buy **${quantity}x ${item.name}**!`);
        }

        db.removeBalance(message.author.id, totalPrice);
        db.addItem(message.author.id, item.id, quantity);

        let msg = `✅ You bought **${quantity}x ${item.name}** for **${totalPrice.toLocaleString()}** coins! 🛍️`;
        if (item.multiplier) {
            msg += `\n✨ **Bonus Applied:** +${Math.round(item.multiplier * 100)}% effect!`;
        }
        return message.reply(msg);
    }
};
