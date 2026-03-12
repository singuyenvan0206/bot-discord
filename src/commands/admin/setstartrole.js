const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'setstartrole',
    aliases: ['ssr'],
    description: 'Cài đặt role bắt buộc để dùng bot (Set required role to use bot)',
    adminOnly: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const guildId = message.guild.id;

        // Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !await db.isOwner(message.author.id)) {
            return message.reply(t('common.no_permission', lang));
        }

        if (!args[0]) {
            return message.reply(t('role.setstartrole_usage', lang, { prefix: config.PREFIX }));
        }

        if (args[0].toLowerCase() === 'none' || args[0].toLowerCase() === 'reset') {
            await db.setGuildSetting(guildId, 'start_role', null);
            return message.reply(t('role.setstartrole_reset', lang));
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

        if (!role) {
            return message.reply(t('role.role_not_found', lang));
        }

        await db.setGuildSetting(guildId, 'start_role', role.id);

        return message.reply(t('role.setstartrole_success', lang, { role: role.name }));
    }
};
