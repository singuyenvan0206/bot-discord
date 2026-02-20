const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'bl'],
    description: 'Kiểm tra số dư của bạn hoặc của người khác',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        const target = message.mentions.users.first() || message.author;
        const targetData = db.getUser(target.id);
        const embed = new EmbedBuilder()
            .setTitle(t('balance.title', lang, { user: target.username }))
            .setDescription(t('balance.description', lang, { balance: targetData.balance.toLocaleString() }))
            .setColor(config.COLORS.WARNING);
        return message.reply({ embeds: [embed] });
    }
};
