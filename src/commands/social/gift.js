const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'gift',
    aliases: ['give', 'present'],
    description: 'Tặng vật phẩm từ túi đồ cho người khác (Gift items to another user)',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        // gift @user amount item
        const target = message.mentions.users.first();
        if (!target) return message.reply(t('gift.usage', lang, { prefix: config.PREFIX }));

        if (target.id === message.author.id) return message.reply(t('gift.self', lang));
        if (target.bot) return message.reply(t('gift.bot', lang));

        // Remove the mention from args to parse amount and item
        const remainingArgs = args.filter(arg => !arg.includes(target.id));
        if (remainingArgs.length < 1) return message.reply(t('gift.usage', lang, { prefix: config.PREFIX }));

        const user = db.getUser(message.author.id);
        const inv = JSON.parse(user.inventory || '{}');

        // Logic similar to sell.js for parsing quantity and item
        let quantityStr = '1';
        let itemQuery = '';

        // Check if first arg (after mention) is numeric/quantity
        if (/^([\d.]+)([kmb])?$/i.test(remainingArgs[0]) || remainingArgs[0].toLowerCase() === 'max' || remainingArgs[0].toLowerCase() === 'all') {
            quantityStr = remainingArgs[0];
            itemQuery = remainingArgs.slice(1).join(' ').toLowerCase();
        } else {
            // Check if last arg is quantity
            const last = remainingArgs[remainingArgs.length - 1];
            if (/^([\d.]+)([kmb])?$/i.test(last) || last.toLowerCase() === 'max' || last.toLowerCase() === 'all') {
                quantityStr = last;
                itemQuery = remainingArgs.slice(0, -1).join(' ').toLowerCase();
            } else {
                itemQuery = remainingArgs.join(' ').toLowerCase();
            }
        }

        if (!itemQuery) return message.reply(t('gift.usage', lang, { prefix: config.PREFIX }));

        const item = SHOP_ITEMS.find(i =>
            String(i.id) === itemQuery ||
            i.name.toLowerCase() === itemQuery ||
            i.name.toLowerCase().includes(itemQuery)
        );

        if (!item) return message.reply(t('gift.not_found', lang));

        const ownedCount = inv[String(item.id)] || 0;
        let quantity = parseAmount(quantityStr, ownedCount);

        if (isNaN(quantity) || quantity < 1) quantity = 1;

        if (ownedCount < quantity) {
            return message.reply(t('gift.insufficient', lang, { count: ownedCount, item: item.name }));
        }

        // Perform the transfer
        db.removeItem(message.author.id, String(item.id), quantity);
        db.addItem(target.id, String(item.id), quantity);

        // Special handling for Wedding Bouquet (ID 703)
        if (item.id === 703) {
            const marriage = db.getMarriage(message.author.id);
            const isSpouse = marriage && (marriage.user1_id === target.id || marriage.user2_id === target.id);

            let msg = t('gift.bouquet_msg', lang, { user: message.author.toString(), target: target.toString() });
            if (isSpouse) {
                msg += t('gift.spouse_gift', lang);

                // Apply 15% Income Buff for 2 hours (7200s)
                const { addBuff } = require('../../utils/multiplier');
                addBuff(target.id, 703, 7200);

                msg += t('gift.bouquet_buff', lang, { target: target.toString() });
            }
            return message.reply(msg);
        }

        return message.reply(t('gift.success', lang, {
            quantity,
            item: item.name,
            user: message.author.toString(),
            target: target.toString()
        }));
    }
};
