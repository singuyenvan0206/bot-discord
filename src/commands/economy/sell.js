const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const config = require('../../config');

module.exports = {
    name: 'sell',
    aliases: ['s'],
    description: `Bán vật phẩm lại cho cửa hàng với giá bằng ${Math.round(config.ECONOMY.SELL_RECOVERY * 100)}% giá gốc`,
    async execute(message, args) {
        const query = args[0]?.toLowerCase();
        const { parseAmount } = require('../../utils/economy');

        if (!query) return message.reply(`${config.EMOJIS.ERROR} Vui lòng chỉ định vật phẩm muốn bán (vđ: \`${config.PREFIX}sell 1\` hoặc \`${config.PREFIX}sell cookies\`).`);

        const user = db.getUser(message.author.id);
        const inv = JSON.parse(user.inventory || '{}');

        // Find item first to get owned count for "all" quantity
        const item = SHOP_ITEMS.find(i =>
            String(i.id) === query ||
            i.name.toLowerCase().includes(query)
        );

        if (!item) return message.reply(`${config.EMOJIS.ERROR} Không tìm thấy vật phẩm. Hãy dùng \`${config.PREFIX}inventory\` để xem túi đồ của bạn.`);

        const ownedCount = inv[String(item.id)] || 0;
        let quantity = args[1] ? parseAmount(args[1], ownedCount) : 1;

        // Default to 1 if not specified or if parseAmount returned an invalid number
        if (isNaN(quantity) || quantity < 1) quantity = 1;

        if (ownedCount < quantity) {
            return message.reply(`${config.EMOJIS.ERROR} Bạn chỉ có **${ownedCount}x ${item.name}**!`);
        }

        // Calculate sell price from config
        const sellPrice = Math.floor(item.price * config.ECONOMY.SELL_RECOVERY) * quantity;

        // Perform transaction
        const success = db.removeItem(message.author.id, String(item.id), quantity);
        if (!success) return message.reply(`${config.EMOJIS.ERROR} Không thể xóa vật phẩm khỏi túi đồ của bạn.`);

        db.addBalance(message.author.id, sellPrice);

        return message.reply(`${config.EMOJIS.SUCCESS} Bạn đã bán **${quantity}x ${item.name}** và nhận được **${sellPrice.toLocaleString()}** coins! ${config.EMOJIS.COIN} (Hoàn tiền ${Math.round(config.ECONOMY.SELL_RECOVERY * 100)}%)`);
    }
};
