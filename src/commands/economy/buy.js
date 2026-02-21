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
        const fullArg = args.join(' ');
        if (!fullArg) return message.reply(t('buy.prompt', lang, { prefix: config.PREFIX }));

        const requests = fullArg.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const { parseAmount } = require('../../utils/economy');
        const user = db.getUser(message.author.id);

        let totalCost = 0;
        const itemsToBuy = [];
        const purchaseDetails = [];

        for (const req of requests) {
            const parts = req.split(/\s+/);
            const query = parts[0]?.toLowerCase();

            // If only one part (e.g. "1"), it means quantity wasn't provided, default to 1
            const quantityArg = parts.length > 1 ? parts[parts.length - 1] : '1';
            let quantity = parseAmount(quantityArg, 1);

            if (isNaN(quantity) || quantity <= 0) {
                quantity = 1;
            }

            // The real query is everything before the quantity, or just the query if no valid quantity provided
            let itemQuery = query;
            if (parts.length > 1 && !isNaN(parseAmount(parts[parts.length - 1], 1))) {
                itemQuery = parts.slice(0, -1).join(' ').toLowerCase();
            } else {
                itemQuery = req.toLowerCase();
            }

            const item = SHOP_ITEMS.find(i =>
                String(i.id) === itemQuery ||
                i.name.toLowerCase().includes(itemQuery)
            );

            if (!item) return message.reply(`❌ ${t('buy.not_found', lang, { prefix: config.PREFIX })} (Tìm kiếm: \`${itemQuery}\`)`);

            const itemName = t(`items.${item.id}.name`, lang);
            const cost = item.price * quantity;
            totalCost += cost;

            itemsToBuy.push({ item, quantity, itemName });
            purchaseDetails.push(`**${quantity}x** ${itemName}`);
        }

        if (user.balance < totalCost) {
            return message.reply(t('buy.insufficient_funds', lang, { price: totalCost.toLocaleString(), quantity: 'tổng cộng', item: 'các vật phẩm này' }));
        }

        db.removeBalance(message.author.id, totalCost);

        let effectMsg = '';
        for (const purchase of itemsToBuy) {
            db.addItem(message.author.id, purchase.item.id, purchase.quantity);
            if (purchase.item.multiplier && itemsToBuy.length === 1) {
                effectMsg += t('buy.effect_activated', lang, { percent: Math.round(purchase.item.multiplier * 100) });
            }
        }

        if (itemsToBuy.length === 1) {
            const single = itemsToBuy[0];
            return message.reply(t('buy.success', lang, { quantity: single.quantity, item: single.itemName, price: totalCost.toLocaleString() }) + effectMsg);
        } else {
            return message.reply(t('buy.success_multiple', lang, { items: purchaseDetails.join(', '), price: totalCost.toLocaleString() }));
        }
    }
};
