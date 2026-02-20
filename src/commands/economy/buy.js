const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'buy',
    aliases: ['b'],
    description: 'Buy an item from the shop',
    async execute(message, args) {
        const query = args[0]?.toLowerCase();
        let quantity = parseInt(args[1]) || 1;

        if (!query) return message.reply('❌ Please specify an item to buy (e.g., `!buy 1` or `!buy cookies`).');
        if (quantity <= 0) return message.reply('❌ Quantity must be a positive number.');

        // Try to find by numerical ID, then by partial name
        const item = SHOP_ITEMS.find(i =>
            String(i.id) === query ||
            i.name.toLowerCase().includes(query)
        );

        const user = db.getUser(message.author.id);

        if (!item) return message.reply('❌ Item not found. Check `!shop` for available items.');

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
