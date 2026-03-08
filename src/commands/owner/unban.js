const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');

module.exports = {
    name: 'unban',
    description: 'Bỏ ban một người dùng (Unban a user)',
    ownerOnly: true,
    async execute(message, args) {
        if (!args[0]) return message.reply('❌ HD: `!unban <ID/Mention>`');

        const target = message.mentions.users.first();
        const targetId = target ? target.id : args[0].replace(/[<@!>]/g, '');

        const user = await db.getUser(targetId);

        if (!user) return message.reply('❌ User not found in database.');

        await db.updateGlobalUser(targetId, { banned: false });

        const lang = await getLanguage(message.author.id, message.guild?.id);
        return message.reply(t('owner.unban_success', lang, { user: targetId }));
    }
};
