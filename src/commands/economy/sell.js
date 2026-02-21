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
        const fullArg = args.join(' ').toLowerCase();

        if (!fullArg) return message.reply(t('sell.prompt', lang, { prefix: config.PREFIX }));

        const user = db.getUser(message.author.id);
        const inv = JSON.parse(user.inventory || '{}');

        // Feature: Sell everything in inventory
        if (fullArg === 'all') {
            const keys = Object.keys(inv);
            if (keys.length === 0) {
                return message.reply(`❌ Túi đồ của bạn đang trống! Không có gì để bán.`);
            }

            let totalEarned = 0;
            let totalItemsCount = 0;

            for (const [idStr, count] of Object.entries(inv)) {
                const item = SHOP_ITEMS.find(i => String(i.id) === idStr);
                if (item) {
                    const sellPrice = Math.floor(item.price * config.ECONOMY.SELL_RECOVERY) * count;
                    totalEarned += sellPrice;
                    totalItemsCount += count;
                }
            }

            // Wipe inventory
            db.updateUser(user.id, { inventory: '{}' });
            db.addBalance(user.id, totalEarned);

            return message.reply(`✅ **Đã thanh lý toàn bộ kho đồ!**\nBạn đã bán tổng cộng **${totalItemsCount}** vật phẩm và thu về **${totalEarned.toLocaleString()} ${config.EMOJIS.COIN}**.`);
        }

        const query = fullArg;
        const { parseAmount } = require('../../utils/economy');

        // Find item first to get owned count for "max" quantity
        const isMax = query.endsWith(' max') || query.endsWith(' a');
        let itemQuery = query;
        let quantityStr = '1';

        if (isMax) {
            itemQuery = query.slice(0, query.lastIndexOf(' '));
            quantityStr = 'max';
        } else {
            // Check if last argument is a number/abbr
            const parts = query.split(' ');
            if (parts.length > 1) {
                const last = parts[parts.length - 1];
                if (/^([\d.]+)([kmb])?$/i.test(last)) {
                    itemQuery = parts.slice(0, -1).join(' ');
                    quantityStr = last;
                }
            }
        }

        const item = SHOP_ITEMS.find(i =>
            String(i.id) === itemQuery ||
            i.name.toLowerCase().includes(itemQuery)
        );

        if (!item) return message.reply(t('sell.not_found', lang, { prefix: config.PREFIX }));

        const itemName = t(`items.${item.id}.name`, lang);
        const ownedCount = inv[String(item.id)] || 0;
        let quantity = parseAmount(quantityStr, ownedCount);

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
