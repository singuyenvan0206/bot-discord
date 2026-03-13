const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const { addHouseProfit } = require('../../utils/economy');
const config = require('../../config');

module.exports = {
    name: 'sell',
    aliases: ['sl'],
    description: 'Bán đồ (Sell items)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const fullArg = args.join(' ').toLowerCase();

        if (!fullArg) return message.reply(t('sell.prompt', lang, { prefix: config.PREFIX }));

        const user = await db.getUser(message.author.id, message.guild.id);
        const inv = JSON.parse(user.inventory || '{}');

        // Feature: Sell everything in inventory
        if (fullArg === 'all') {
            const keys = Object.keys(inv);
            if (keys.length === 0) {
                return message.reply(t('sell.all_empty', lang));
            }

            let totalEarned = 0;
            let totalItemsCount = 0;

            const isTrader = user.job === 'trader';
            const recoveryRate = isTrader ? 0.85 : config.ECONOMY.SELL_RECOVERY;

            for (const [idStr, count] of Object.entries(inv)) {
                const item = SHOP_ITEMS.find(i => String(i.id) === idStr);
                if (item) {
                    const sellPrice = Math.floor(item.price * recoveryRate) * count;
                    totalEarned += sellPrice;
                    totalItemsCount += count;
                }
            }

            // Wipe inventory
            await db.updateUser(message.guild.id, message.author.id, { inventory: '{}' });
            await db.addBalance(message.guild.id, message.author.id, totalEarned);

            // House profit from "burned" money
            let totalMarketValue = 0;
            for (const [idStr, count] of Object.entries(inv)) {
                const item = SHOP_ITEMS.find(i => String(i.id) === idStr);
                if (item) totalMarketValue += (item.price * count);
            }
            const burned = totalMarketValue - totalEarned;
            // Removed: if (burned > 0) await addHouseProfit(message, burned); // Bot fund restriction

            return message.reply(t('sell.all_success', lang, { count: totalItemsCount, price: totalEarned.toLocaleString(), emoji: config.EMOJIS.COIN }));
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

        const item = SHOP_ITEMS.find(i => {
            const localizedName = t(`items.${i.id}.name`, lang).toLowerCase();
            return String(i.id) === itemQuery ||
                (i.numeric_id && String(i.numeric_id) === itemQuery) ||
                i.name.toLowerCase().includes(itemQuery) ||
                localizedName.includes(itemQuery);
        });


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
        const isTrader = user.job === 'trader';
        const recoveryRate = isTrader ? 0.85 : config.ECONOMY.SELL_RECOVERY;
        const sellPrice = Math.floor(item.price * recoveryRate) * quantity;

        // Perform transaction
        const success = await db.removeItem(message.guild.id, message.author.id, String(item.id), quantity);
        if (!success) return message.reply(t('sell.fail', lang));

        await db.addBalance(message.guild.id, message.author.id, sellPrice);

        const burned = (item.price * quantity) - sellPrice;
        // Removed: if (burned > 0) await addHouseProfit(message, burned); // Bot fund restriction

        return message.reply(t('sell.success', lang, {
            quantity,
            item: itemName,
            price: sellPrice.toLocaleString(),
            emoji: config.EMOJIS.COIN,
            percent: Math.round(recoveryRate * 100)
        }));
    }
};
