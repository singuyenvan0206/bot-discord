const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'transfer',
    aliases: ['pay', 'tf', 't'],
    description: 'Chuyển tiền (Transfer money)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        const targetUser = message.mentions.users.first();
        const user = await db.getUser(message.author.id, message.guild.id);
        const amount = parseAmount(args[1], (user.balance || 0));

        if (!targetUser) return message.reply(t('transfer.mention', lang));
        if (isNaN(amount) || amount <= 0) return message.reply(t('transfer.invalid', lang));

        if (targetUser.id === message.author.id) return message.reply(t('transfer.self', lang));
        if (targetUser.bot) return message.reply(t('transfer.bot', lang));
        if ((user.balance || 0) < amount) return message.reply(t('transfer.insufficient', lang, { balance: (user.balance || 0).toLocaleString() }));

        await db.removeBalance(message.guild.id, message.author.id, amount);
        await db.addBalance(message.guild.id, targetUser.id, amount);

        return message.reply(t('transfer.success', lang, { amount: amount.toLocaleString(), user: targetUser.toString() }));
    }
};
