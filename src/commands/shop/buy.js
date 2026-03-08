const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const { addHouseProfit } = require('../../utils/economy');
const config = require('../../config');

module.exports = {
    name: 'buy',
    aliases: ['b'],
    description: 'Mua đồ (Buy items)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const fullArg = args.join(' ').toLowerCase();
        if (!fullArg) return message.reply(t('buy.prompt', lang, { prefix: config.PREFIX }));

        const user = await db.getUser(message.author.id, message.guild.id);

        if (fullArg === 'all') {
            const buyableItems = SHOP_ITEMS.filter(i => !i.unbuyable);
            // Find total price of 1 of every item
            const totalCost = buyableItems.reduce((sum, item) => sum + item.price, 0);
            if ((user.balance || 0) < totalCost) {
                return message.reply(t('buy.all_insufficient', lang, { price: totalCost.toLocaleString(), emoji: config.EMOJIS.COIN, balance: (user.balance || 0).toLocaleString() }));
            }

            await db.removeBalance(message.guild.id, message.author.id, totalCost);

            // Add 1 of every item to inventory
            for (const item of buyableItems) {
                await db.addItem(message.guild.id, message.author.id, item.id, 1);
            }

            return message.reply(t('buy.all_success', lang, { count: buyableItems.length.toLocaleString(), price: totalCost.toLocaleString(), emoji: config.EMOJIS.COIN }));
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
            const isKw = ['max', 'a', 'all'].includes(lastWord);
            const isNumOrAbbr = lastWord ? /^([\d.]+)([kmb])?$/i.test(lastWord) : false;

            let quantityStr = '1';
            let itemQuery = req.toLowerCase();

            if (lastWord && (isKw || isNumOrAbbr)) {
                itemQuery = parts.slice(0, -1).join(' ').toLowerCase();
                quantityStr = lastWord;
            }

            const isNumericQuery = /^\d+$/.test(itemQuery);
            const item = SHOP_ITEMS.find(i =>
                String(i.id) === itemQuery ||
                (i.numeric_id && String(i.numeric_id) === itemQuery) ||
                (!isNumericQuery && i.name.toLowerCase().includes(itemQuery))
            );

            if (!item) return message.reply(`❌ ${t('buy.not_found', lang)} (Tìm kiếm: \`${itemQuery}\`)`);

            if (item.unbuyable) {
                return message.reply(`❌ ${t(`items.${item.id}.name`, lang)} ${t('buy.cannot_buy_event', lang) || 'không thể mua bằng tiền từ cửa hàng!'}`);
            }

            // Calculate max affordable, considering items already pending in this multi-buy
            const availableBalance = Math.max(0, (user.balance || 0) - totalCost);
            let maxAffordable = Math.floor(availableBalance / item.price);
            if (['all', 'max', 'a'].includes(quantityStr.toLowerCase())) {
                maxAffordable = Math.min(maxAffordable, 100);
            }
            let quantity = parseAmount(quantityStr, maxAffordable);

            if (isNaN(quantity) || quantity <= 0) {
                return message.reply(t('buy.insufficient_item', lang));
            }

            const itemName = t(`items.${item.id}.name`, lang);

            // Trader Discount (611) Logic
            let itemPrice = item.price;
            let buffs = [];
            try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
            const discountBuff = buffs.find(b => b.itemId === 611 && b.expiresAt > Math.floor(Date.now() / 1000));

            if (discountBuff) {
                itemPrice = Math.floor(itemPrice * (1 - (discountBuff.discount || 0.3)));
                // Mark for removal later
                buffs = buffs.filter(b => b.itemId !== 611);
                await db.updateUser(message.guild.id, message.author.id, { active_buffs: JSON.stringify(buffs) });
            }

            const cost = itemPrice * quantity;
            totalCost += cost;

            itemsToBuy.push({ item, quantity, itemName });
            purchaseDetails.push(`**${quantity.toLocaleString()}x** ${itemName}`);
        }

        if ((user.balance || 0) < totalCost) {
            return message.reply(t('buy.insufficient_funds', lang, { price: totalCost.toLocaleString(), quantity: 'tổng cộng', item: 'các vật phẩm này' }));
        }

        await db.removeBalance(message.guild.id, message.author.id, totalCost);
        await addHouseProfit(message, totalCost);

        for (const purchase of itemsToBuy) {
            await db.addItem(message.guild.id, message.author.id, purchase.item.id, purchase.quantity);
        }

        if (itemsToBuy.length === 1) {
            const single = itemsToBuy[0];
            return message.reply(t('buy.success', lang, { quantity: single.quantity.toLocaleString(), item: single.itemName, price: totalCost.toLocaleString() }));
        } else {
            return message.reply(t('buy.success_multiple', lang, { items: purchaseDetails.join(', '), price: totalCost.toLocaleString() }));
        }
    }
};
