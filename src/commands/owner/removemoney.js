const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'removemoney',
    aliases: ['rmm', 'rm'],
    description: 'Trừ tiền của người dùng (Remove money from user)',
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

        const amountStr = args[args.length - 1];
        const amount = parseAmount(amountStr);

        if (isNaN(amount) || amount <= 0) return message.reply(t('common.invalid_amount', lang));

        // Process all targets
        for (const target of targets) {
            await db.removeBalance(message.guild.id, target.id, amount);
        }

        const userList = targets.map(u => `**${u.username}**`).join(', ');
        return message.reply(`✅ Đã trừ **${amount.toLocaleString()}** ${config.EMOJIS.COIN} của: ${userList}.`);
    }
};
