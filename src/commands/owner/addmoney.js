const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'addmoney',
    aliases: ['am'],
    description: 'Thêm tiền cho người dùng (Add money to user)',
    ownerOnly: true,
    usage: '<@user> <amount>',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);

        // Collect all mentioned users
        let targets = Array.from(message.mentions.users.values());

        // If no mentions, try to fetch from ID in first argument
        if (targets.length === 0 && args[0]) {
            const target = await message.client.users.fetch(args[0]).catch(() => null);
            if (target) targets.push(target);
        }

        if (targets.length === 0) return message.reply(t('common.error', lang));

        // Multi-ping might contain the amount as the last argument if mentions are at the start
        // Or if only one user is mentioned by ID, amount is args[1]
        // Strategy: Parse the last argument as amount
        const amountStr = args[args.length - 1];
        const amount = parseAmount(amountStr);

        if (isNaN(amount) || amount <= 0) return message.reply(t('common.invalid_amount', lang));

        // Process all targets
        for (const target of targets) {
            await db.addBalance(message.guild.id, target.id, amount);
        }

        const userList = targets.map(u => `**${u.username}**`).join(', ');
        return message.reply(`✅ Đã thêm **${amount.toLocaleString()}** ${config.EMOJIS.COIN} cho: ${userList}.`);
    }
};
