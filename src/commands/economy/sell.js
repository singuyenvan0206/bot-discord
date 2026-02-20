const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'sell',
    aliases: ['s'],
    description: `Bán vật phẩm lại cho cửa hàng với giá bằng ${Math.round(config.ECONOMY.SELL_RECOVERY * 100)}% giá gốc`,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const query = args[0]?.toLowerCase();
        const { parseAmount } = require('../../utils/economy');

        if (!query) return message.reply(t('sell.prompt', lang, { prefix: config.PREFIX }));

        const user = db.getUser(message.author.id);
        const inv = JSON.parse(user.inventory || '{}');

        // Find item first to get owned count for "all" quantity
        const item = SHOP_ITEMS.find(i =>
            String(i.id) === query ||
            i.name.toLowerCase().includes(query)
        );

        if (!item) return message.reply(t('sell.not_found', lang, { prefix: config.PREFIX }));

        const itemName = t(`items.${item.id}.name`, lang);
        const ownedCount = inv[String(item.id)] || 0;
        let quantity = args[1] ? parseAmount(args[1], ownedCount) : 1;

        // Default to 1 if not specified or if parseAmount returned an invalid number
        if (isNaN(quantity) || quantity < 1) quantity = 1;

        if (ownedCount < quantity) {
            return message.reply(t('sell.insufficient_owned', lang, { count: ownedCount, item: itemName }));
        }

        // Calculate sell price from config
        const sellPrice = Math.floor(item.price * config.ECONOMY.SELL_RECOVERY) * quantity;

        // Perform transaction
        const success = db.removeItem(message.author.id, String(item.id), quantity);
        if (!success) return message.reply(t('sell.fail', lang));

        db.addBalance(message.author.id, sellPrice);

        return message.reply(t('sell.success', lang, {
            quantity,
            item: itemName,
            price: sellPrice.toLocaleString(),
            emoji: config.EMOJIS.COIN,
            percent: Math.round(config.ECONOMY.SELL_RECOVERY * 100)
        }));
    }
};
