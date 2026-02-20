const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const config = require('../../config');

module.exports = {
    name: 'buy',
    aliases: ['b'],
    description: 'Mua một vật phẩm từ cửa hàng',
    async execute(message, args) {
        const query = args[0]?.toLowerCase();
        const { parseAmount } = require('../../utils/economy');
        let quantity = parseAmount(args[1], 1); // 1 is default for "all" here if balance isn't relevant

        if (!query) return message.reply(`${config.EMOJIS.ERROR} Vui lòng chỉ định vật phẩm muốn mua (vđ: \`${config.PREFIX}buy 1\` hoặc \`${config.PREFIX}buy cookies\`).`);
        if (quantity <= 0) return message.reply(`${config.EMOJIS.ERROR} Số lượng phải là một số dương.`);

        // Try to find by numerical ID, then by partial name
        const item = SHOP_ITEMS.find(i =>
            String(i.id) === query ||
            i.name.toLowerCase().includes(query)
        );

        const user = db.getUser(message.author.id);

        if (!item) return message.reply(`${config.EMOJIS.ERROR} Không tìm thấy vật phẩm. Hãy dùng \`${config.PREFIX}shop\` để xem các vật phẩm có sẵn.`);

        const totalPrice = item.price * quantity;

        if (user.balance < totalPrice) {
            return message.reply(`${config.EMOJIS.ERROR} Bạn cần **${totalPrice.toLocaleString()}** coins để mua **${quantity}x ${item.name}**!`);
        }

        db.removeBalance(message.author.id, totalPrice);
        db.addItem(message.author.id, item.id, quantity);

        let msg = `${config.EMOJIS.SUCCESS} Bạn đã mua **${quantity}x ${item.name}** với giá **${totalPrice.toLocaleString()}** coins! 🛍️`;
        if (item.multiplier) {
            msg += `\n✨ **Hiệu ứng kích hoạt:** +${Math.round(item.multiplier * 100)}% hiệu quả!`;
        }
        return message.reply(msg);
    }
};
