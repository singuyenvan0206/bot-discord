const db = require('../../database');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'startup',
    aliases: ['boot', 'poweron'],
    description: '[OWNER] Khởi động lại hệ thống lệnh (Re-enable command system)',
    ownerOnly: true,
    async execute(message, args) {
        if (!await db.isOwner(message.author.id)) return;

        const lang = await getLanguage(message.author.id, message.guild?.id);

        // Reset the stopped flag
        await db.setGlobalSetting('bot_is_stopped', 'false');

        return message.reply(lang === 'vi' ? `**Hệ thống đã sẵn sàng!**\nBot đã quay trở lại phục vụ . 🚀` : `**System is online!**\nBot is back at your service. 🚀`);

        console.log(`[STARTUP] Re-enabled by owner (${message.author.tag})`);
    }
};
