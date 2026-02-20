const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'buy',
    aliases: ['b'],
    description: 'Buy an item from the shop',
    async execute(message, args) {
        const inputId = args[0];
        let quantity = parseInt(args[1]);

        if (!inputId) return message.reply('❌ Please specify an item ID to buy (e.g., `!buy 1`).');

        // Try to find by number ID first, then by name if needed (optional, keeping it simple as requested)
        const item = SHOP_ITEMS.find(i => String(i.id) === inputId);
        const user = db.getUser(message.author.id);

        if (!item) return message.reply('❌ Item not found. Check `!shop` for the correct Number IDs.');

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
