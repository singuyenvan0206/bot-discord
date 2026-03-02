const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'setwcchannel',
    aliases: ['setwc', 'wcset', 'wordchainchannel'],
    description: 'Thiết lập kênh chỉ dành cho Word Chain (Set wordchain-only channel)',
    adminOnly: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        // Permission Check: Manage Guild, Guild Owner, or Bot Owner
        const isGuildOwner = message.guild.ownerId === message.author.id;
        const isBotOwner = db.isOwner(message.author.id);

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !isGuildOwner && !isBotOwner) {
            return message.reply(t('common.no_permission', lang));
        }

        const guildId = message.guild.id;

        if (!args[0]) {
            // Show current setting
            const guild = await db.getGuild(guildId);
            const currentChannel = guild?.wordchain_channel;
            if (currentChannel) {
                return message.reply(t('wordchain.channel_current', lang, { channel: `<#${currentChannel}>` }));
            }
            return message.reply(t('wordchain.channel_usage', lang, { prefix: config.PREFIX }));
        }

        if (['reset', 'none', 'off'].includes(args[0].toLowerCase())) {
            await db.updateGuild(guildId, { wordchain_channel: null });
            return message.reply(t('wordchain.channel_reset', lang));
        }

        const channel = message.mentions.channels.first();
        if (!channel || !channel.isTextBased()) {
            return message.reply(t('wordchain.channel_invalid', lang));
        }

        await db.updateGuild(guildId, { wordchain_channel: channel.id });
        return message.reply(t('wordchain.channel_set', lang, { channel: `<#${channel.id}>` }));
    }
};
