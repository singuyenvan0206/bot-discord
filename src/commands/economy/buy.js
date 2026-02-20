const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'buy',
    aliases: ['b'],
    description: 'Mua một vật phẩm từ cửa hàng',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const query = args[0]?.toLowerCase();
        const { parseAmount } = require('../../utils/economy');
        let quantity = parseAmount(args[1], 1); // 1 is default for "all" here if balance isn't relevant

        if (!query) return message.reply(t('buy.prompt', lang, { prefix: config.PREFIX }));
        if (quantity <= 0) return message.reply(t('buy.invalid_qty', lang));

        // Try to find by numerical ID, then by partial name (internal name)
        const item = SHOP_ITEMS.find(i =>
            String(i.id) === query ||
            i.name.toLowerCase().includes(query)
        );

        const user = db.getUser(message.author.id);
        if (!item) return message.reply(t('buy.not_found', lang, { prefix: config.PREFIX }));

        const itemName = t(`items.${item.id}.name`, lang);
        const totalPrice = item.price * quantity;

        if (user.balance < totalPrice) {
            return message.reply(t('buy.insufficient_funds', lang, { price: totalPrice.toLocaleString(), quantity, item: itemName }));
        }

        db.removeBalance(message.author.id, totalPrice);
        db.addItem(message.author.id, item.id, quantity);

        let msg = t('buy.success', lang, { quantity, item: itemName, price: totalPrice.toLocaleString() });
        if (item.multiplier) {
            msg += t('buy.effect_activated', lang, { percent: Math.round(item.multiplier * 100) });
        }
        return message.reply(msg);
    }
};
