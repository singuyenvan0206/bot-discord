const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');

module.exports = {
    name: 'setwcchannel',
    description: 'Set the dedicated channel for Word Chain game.',
    adminOnly: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const channel = message.mentions.channels.first() || message.channel;

        if (!channel.isTextBased()) {
            return message.reply(t('common.invalid_channel', lang));
        }

        await db.updateGuild(message.guild.id, { wordchain_channel: channel.id });

        const embed = new EmbedBuilder()
            .setTitle('✅ Word Chain Config')
            .setDescription(t('wordchain.config_success', lang, { channel: `<#${channel.id}>` }))
            .setColor(0x2ecc71);

        message.reply({ embeds: [embed] });
    },
};
