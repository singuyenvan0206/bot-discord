const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'removemoney',
    aliases: ['rmm'],
    description: 'Trừ tiền của người dùng (Remove money from user)',
    ownerOnly: true,
    usage: '<@user> <amount>',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild.id);
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) return message.reply(t('common.error', lang));

        const amount = parseAmount(args[1]);
        if (isNaN(amount) || amount <= 0) return message.reply(t('common.invalid_amount', lang));

        db.removeBalance(message.guild.id, target.id, amount);

        return message.reply(`✅ Đã trừ **${amount.toLocaleString()}** ${config.EMOJIS.COIN} của **${target.username}**.`);
    }
};
