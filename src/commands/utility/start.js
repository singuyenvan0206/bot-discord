const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'start',
    description: 'Bắt đầu sử dụng bot và nhận role (Start using bot and get role)',
    cooldown: 5,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const guildId = message.guild.id;

        const roleId = await db.getGuildSetting(guildId, 'start_role', null);
        
        if (!roleId) {
            return message.reply(t('role.no_role_configured', lang));
        }

        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return message.reply(t('role.role_not_found', lang));
        }

        try {
            if (message.member.roles.cache.has(roleId)) {
                return message.reply(t('role.start_success', lang, { user: message.author.username, role: role.name }));
            }

            await message.member.roles.add(role).catch(err => {
                console.error(`[Role] Failed to add role ${roleId} to user ${message.author.id}:`, err);
                throw err;
            });

            // Initialize user in DB if not exists
            await db.getUser(message.author.id, guildId);

            return message.reply(t('role.start_success', lang, { user: message.author.username, role: role.name }));
        } catch (error) {
            console.error('[Start Command] Error:', error);
            return message.reply(t('common.error', lang) + " (Bot lacks 'Manage Roles' permission?)");
        }
    }
};
