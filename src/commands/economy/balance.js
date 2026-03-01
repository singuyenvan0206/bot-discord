const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'bl', 'cash'],
    description: 'Kiểm tra tiền (Check balance)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        const target = message.mentions.users.first() || message.author;
        const targetData = await db.getUser(target.id, message.guild.id);
        const embed = new EmbedBuilder()
            .setTitle(t('balance.title', lang, { user: target.username }))
            .setDescription(t('balance.description', lang, { balance: (targetData.balance || 0).toLocaleString() }))
            .setColor(config.COLORS.WARNING);
        return message.reply({ embeds: [embed] });
    }
};
