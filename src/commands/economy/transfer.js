const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'transfer',
    aliases: ['pay', 'tf'],
    description: 'Chuyển tiền cho người dùng khác',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        const targetUser = message.mentions.users.first();
        const user = db.getUser(message.author.id);
        const { parseAmount } = require('../../utils/economy');
        const amount = parseAmount(args[1], user.balance);

        if (!targetUser) return message.reply(t('transfer.mention', lang));
        if (isNaN(amount) || amount <= 0) return message.reply(t('transfer.invalid', lang));

        if (targetUser.id === message.author.id) return message.reply(t('transfer.self', lang));
        if (targetUser.bot) return message.reply(t('transfer.bot', lang));
        if (user.balance < amount) return message.reply(t('transfer.insufficient', lang, { balance: user.balance.toLocaleString() }));

        db.removeBalance(message.author.id, amount);
        db.addBalance(targetUser.id, amount);

        return message.reply(t('transfer.success', lang, { amount: amount.toLocaleString(), user: targetUser.toString() }));
    }
};
