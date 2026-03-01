const db = require('../../database');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'shutdown',
    aliases: ['poweroff', 'kill', 'sd', 'off'],
    description: 'Tắt bot (Shutdown the bot)',
    ownerOnly: true,
    async execute(message, args) {
        if (!await db.isOwner(message.author.id)) return;

        const lang = await getLanguage(message.author.id, message.guild?.id);

        // Persistently mark as stopped
        await db.setGlobalSetting('bot_is_stopped', 'true');

        console.log(`[SHUTDOWN] Initiated by owner (${message.author.tag}) at ${new Date().toISOString()}`);

        return message.reply(lang === 'vi'
            ? `**Hệ thống đã chuyển sang chế độ ngủ theo lệnh của Owner.**\nTạm biệt! 👋\n*(Sử dụng lệnh \`startup\` để đánh thức bot)*`
            : `**System is now in sleep mode by Owner command.**\nGoodbye! 👋\n*(Use \`startup\` to wake up the bot)*`);
    }
};
