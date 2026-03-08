const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');

module.exports = {
    name: 'ban',
    description: 'Ban một người dùng khỏi bot (Ban a user from the bot)',
    ownerOnly: true,
    async execute(message, args) {
        if (!args[0]) return message.reply('❌ HD: `!ban <ID/Mention>`');

        const targetId = args[0].replace(/[<@!>]/g, '');
        const user = await db.getUser(targetId);

        if (!user) return message.reply('❌ User not found in database.');

        if (await db.isOwner(targetId)) {
            return message.reply('❌ You cannot ban the bot owner.');
        }

        await db.updateGlobalUser(targetId, { banned: true });

        const lang = await getLanguage(message.author.id, message.guild?.id);
        return message.reply(t('owner.ban_success', lang, { user: targetId }));
    }
};
