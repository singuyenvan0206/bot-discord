const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const config = require('../../config');

module.exports = {
    name: 'buy',
    aliases: ['b'],
    description: 'Buy an item from the shop',
    async execute(message, args) {
        const query = args[0]?.toLowerCase();
        const { parseAmount } = require('../../utils/economy');
        let quantity = parseAmount(args[1], 1); // 1 is default for "all" here if balance isn't relevant

        if (!query) return message.reply(`${config.EMOJIS.ERROR} Please specify an item to buy (e.g., \`${config.PREFIX}buy 1\` or \`${config.PREFIX}buy cookies\`).`);
        if (quantity <= 0) return message.reply(`${config.EMOJIS.ERROR} Quantity must be a positive number.`);

        // Try to find by numerical ID, then by partial name
        const item = SHOP_ITEMS.find(i =>
            String(i.id) === query ||
            i.name.toLowerCase().includes(query)
        );

        const user = db.getUser(message.author.id);

        if (!item) return message.reply(`${config.EMOJIS.ERROR} Item not found. Check \`${config.PREFIX}shop\` for available items.`);

        const totalPrice = item.price * quantity;

        if (user.balance < totalPrice) {
            return message.reply(`${config.EMOJIS.ERROR} You need **${totalPrice.toLocaleString()}** coins to buy **${quantity}x ${item.name}**!`);
        }

        db.removeBalance(message.author.id, totalPrice);
        db.addItem(message.author.id, item.id, quantity);

        let msg = `${config.EMOJIS.SUCCESS} You bought **${quantity}x ${item.name}** for **${totalPrice.toLocaleString()}** coins! 🛍️`;
        if (item.multiplier) {
            msg += `\n✨ **Bonus Applied:** +${Math.round(item.multiplier * 100)}% effect!`;
        }
        return message.reply(msg);
    }
};
