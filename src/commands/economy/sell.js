const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'sell',
    aliases: ['s'],
    description: 'Sell an item back to the shop for 70% of its price',
    async execute(message, args) {
        const inputId = args[0];
        let quantity = parseInt(args[1]);

        if (!inputId) return message.reply('❌ Please specify an item ID to sell (e.g., `!sell 1`).');

        // Try to find item by ID
        const item = SHOP_ITEMS.find(i => String(i.id) === inputId);
        if (!item) return message.reply('❌ Item not found. Check `!inventory` for IDs.');

        // Default to 1 if not specified
        if (isNaN(quantity) || quantity < 1) quantity = 1;

        const user = db.getUser(message.author.id);
        const inv = JSON.parse(user.inventory || '{}');

        // Check ownership
        const ownedCount = inv[String(item.id)] || 0;
        if (ownedCount < quantity) {
            return message.reply(`❌ You only have **${ownedCount}x ${item.name}**!`);
        }

        // Calculate sell price (70% of buy price)
        const sellPrice = Math.floor(item.price * 0.7) * quantity;

        // Perform transaction
        const success = db.removeItem(message.author.id, String(item.id), quantity);
        if (!success) return message.reply('❌ Failed to remove items from your inventory.');

        db.addBalance(message.author.id, sellPrice);

        return message.reply(`✅ You sold **${quantity}x ${item.name}** for **${sellPrice.toLocaleString()}** coins! 💰 (70% return)`);
    }
};
