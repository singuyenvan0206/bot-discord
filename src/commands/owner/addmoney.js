const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'addmoney',
    aliases: ['am'],
    description: 'Thêm tiền cho người dùng (Add money to user)',
    ownerOnly: true,
    usage: '<@user|all> <amount>',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);

        if (!args[0]) return message.reply(t('common.error', lang));

        // Check for "all"
        if (args[0].toLowerCase() === 'all') {
            const amount = parseAmount(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply(t('common.invalid_amount', lang));

            await db.addAllBalance(amount);
            return message.reply(t('owner.addmoney_all_success', lang, { amount: amount.toLocaleString(), emoji: config.EMOJIS.COIN }));
        }

        // Collect all mentioned users
        let targets = Array.from(message.mentions.users.values());

        // If no mentions, try to fetch from ID in first argument
        if (targets.length === 0 && args[0]) {
            const target = await message.client.users.fetch(args[0]).catch(() => null);
            if (target) targets.push(target);
        }

        if (targets.length === 0) return message.reply(t('common.error', lang));

        const amountStr = args[args.length - 1];
        const amount = parseAmount(amountStr);

        if (isNaN(amount) || amount <= 0) return message.reply(t('common.invalid_amount', lang));

        // Process all targets
        for (const target of targets) {
            await db.addBalance(message.guild.id, target.id, amount);
        }

        const userList = targets.map(u => `**${u.username}**`).join(', ');
        return message.reply(t('owner.addmoney_success', lang, { amount: amount.toLocaleString(), emoji: config.EMOJIS.COIN, users: userList }));
    }
};
