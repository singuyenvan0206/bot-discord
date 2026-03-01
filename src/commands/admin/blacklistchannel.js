const { PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');

module.exports = {
    name: 'blacklistchannel',
    aliases: ['blc', 'blacklistchan'],
    description: 'Chặn/Bỏ chặn lệnh và XP trong channel (Blacklist/Whitelist a channel)',
    adminOnly: true,
    usage: '[#channel]',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);

        // Target channel is mentioned, or provided by ID, or the current channel
        const targetChannel = message.mentions.channels.first() ||
            (args[0] ? await message.guild.channels.fetch(args[0]).catch(() => null) : message.channel);

        if (!targetChannel || !targetChannel.isTextBased()) {
            return message.reply(t('common.invalid_channel', lang) || '❌ Channel không hợp lệ.');
        }

        // Fetch current list
        const rawList = await db.getGuildSetting(message.guild.id, 'blacklisted_channels', '[]');
        let blacklistedChannels = [];
        try {
            blacklistedChannels = JSON.parse(rawList);
        } catch (e) {
            blacklistedChannels = [];
        }

        const index = blacklistedChannels.indexOf(targetChannel.id);
        let statusMsg = '';

        if (index === -1) {
            // Add to blacklist
            blacklistedChannels.push(targetChannel.id);
            statusMsg = t('admin.blacklist_added', lang, { channel: targetChannel.toString() }) ||
                `✅ Đã chặn hoạt động của bot tại ${targetChannel.toString()}.`;
        } else {
            // Remove from blacklist
            blacklistedChannels.splice(index, 1);
            statusMsg = t('admin.blacklist_removed', lang, { channel: targetChannel.toString() }) ||
                `✅ Đã kích hoạt lại hoạt động của bot tại ${targetChannel.toString()}.`;
        }

        await db.setGuildSetting(message.guild.id, 'blacklisted_channels', JSON.stringify(blacklistedChannels));

        return message.reply(statusMsg);
    }
};
