const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'setprefix',
    aliases: ['sp', 'prefix'],
    description: 'Cài đặt tiền tố (prefix) tùy chỉnh cho server (Set a custom prefix for this server)',
    adminOnly: true,
    cooldown: 5,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const guildId = message.guild.id;

        // Permission Check: Manage Guild or Bot Owner
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !await db.isOwner(message.author.id)) {
            return message.reply(t('common.no_permission', lang));
        }

        const currentGuildRow = await db.getGuild(guildId);
        const currentPrefix = currentGuildRow?.prefix || config.PREFIX;

        if (!args[0]) {
            return message.reply(t('admin.setprefix_usage', lang, { prefix: currentPrefix }));
        }

        const newPrefix = args[0];

        if (newPrefix.toLowerCase() === 'reset' || newPrefix.toLowerCase() === 'default') {
            await db.updateGuild(guildId, { prefix: null });
            return message.reply(t('admin.setprefix_reset', lang, { defaultPrefix: config.PREFIX }));
        }

        if (newPrefix.length > 5) {
            return message.reply(t('admin.setprefix_too_long', lang));
        }

        await db.updateGuild(guildId, { prefix: newPrefix });

        return message.reply(t('admin.setprefix_success', lang, { newPrefix }));
    }
};
