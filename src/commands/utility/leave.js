const { getVoiceConnection } = require('@discordjs/voice');
const { getLanguage, t } = require('../../utils/i18n');

module.exports = {
    name: 'leave',
    aliases: ['out', 'dc', 'disconnect'],
    description: 'Yêu cầu bot rời khỏi kênh voice (Make the bot leave the voice channel)',
    category: 'utility',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const connection = getVoiceConnection(message.guild.id);

        if (!connection) {
            return message.reply('❌ Bot hiện không ở trong kênh voice nào cả!');
        }

        connection.destroy();
        return message.reply('✅ Đã ngắt kết nối và rời khỏi kênh voice.');
    },
};
