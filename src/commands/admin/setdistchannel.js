const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'setdistchannel',
    aliases: ['sdc', 'setdist'],
    description: 'Kênh chia tiền (Set distribution channel)',
    adminOnly: true,
    async execute(message, args) {
        const lang =   getLanguage(message.author.id, message.guild?.id);

        // Permission Check: Manage Guild, Guild Owner, or Bot Owner
        const isGuildOwner = message.guild.ownerId === message.author.id;
        const isBotOwner =   db.isOwner(message.author.id);

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !isGuildOwner && !isBotOwner) {
            return message.reply(t('common.no_permission', lang));
        }

        const channel = message.mentions.channels.first();
        const guildId = message.guild.id;

        if (!args[0]) {
            return message.reply(t('economy.setdistchannel_usage', lang, { prefix: config.PREFIX }));
        }

        if (args[0].toLowerCase() === 'reset' || args[0].toLowerCase() === 'none') {
              db.updateGuild(guildId, { dist_channel: null });
            return message.reply(t('economy.setdistchannel_reset', lang));
        }

        if (!channel || !channel.isTextBased()) {
            return message.reply(t('economy.setdistchannel_invalid', lang));
        }

          db.updateGuild(guildId, { dist_channel: channel.id });
        return message.reply(t('economy.setdistchannel_success', lang, { channel: `<#${channel.id}>` }));
    }
};
