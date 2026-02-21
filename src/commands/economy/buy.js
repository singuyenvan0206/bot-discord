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
        const fullArg = args.join(' ').toLowerCase();
        if (!fullArg) return message.reply(t('buy.prompt', lang, { prefix: config.PREFIX }));

        const user = db.getUser(message.author.id);

        if (fullArg === 'all') {
            // Find total price of 1 of every item
            const totalCost = SHOP_ITEMS.reduce((sum, item) => sum + item.price, 0);
            if (user.balance < totalCost) {
                return message.reply(`❌ Bạn cần ít nhất **${totalCost.toLocaleString()} ${config.EMOJIS.COIN}** để mua toàn bộ cửa hàng! (Số dư: **${user.balance.toLocaleString()}**)`);
            }

            db.removeBalance(user.id, totalCost);

            // Add 1 of every item to inventory
            for (const item of SHOP_ITEMS) {
                db.addItem(user.id, item.id, 1);
            }

            return message.reply(`✅ **Đã thầu toàn bộ cửa hàng!**\nBạn đã mua mỗi vật phẩm trong shop 1 cái (Tổng cộng **${SHOP_ITEMS.length}** món) với giá **${totalCost.toLocaleString()} ${config.EMOJIS.COIN}**.`);
        }

        const requests = fullArg.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const { parseAmount } = require('../../utils/economy');

        let totalCost = 0;
        const itemsToBuy = [];
        const purchaseDetails = [];

        for (const req of requests) {
            const parts = req.split(/\s+/);
            const query = parts[0]?.toLowerCase();

            // The last word could be a quantity. Let's explicitly check it.
            const lastWord = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
            const isKw = ['max', 'a'].includes(lastWord);
            const isNumOrAbbr = lastWord ? /^([\d.]+)([kmb])?$/i.test(lastWord) : false;

            let quantityStr = '1';
            let itemQuery = req.toLowerCase();

            if (lastWord && (isKw || isNumOrAbbr)) {
                itemQuery = parts.slice(0, -1).join(' ').toLowerCase();
                quantityStr = lastWord;
            }

            const item = SHOP_ITEMS.find(i =>
                String(i.id) === itemQuery ||
                i.name.toLowerCase().includes(itemQuery)
            );

            if (!item) return message.reply(`❌ ${t('buy.not_found', lang, { prefix: config.PREFIX })} (Tìm kiếm: \`${itemQuery}\`)`);

            // Calculate max affordable, considering items already pending in this multi-buy
            const availableBalance = Math.max(0, user.balance - totalCost);
            let quantity = parseAmount(quantityStr, Math.floor(availableBalance / item.price));

            if (isNaN(quantity) || quantity <= 0) {
                return message.reply(`❌ Bạn không đủ tiền trả cho vật phẩm này.`);
            }

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
