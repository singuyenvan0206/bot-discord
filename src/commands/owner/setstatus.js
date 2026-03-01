const db = require('../../database');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'setstatus',
    aliases: ['status', 'activity', 'ss'],
    description: 'Đặt trạng thái cho bot (Set bot status activity)',
    ownerOnly: true,
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);

        const typeStr = args[0]?.toLowerCase();
        let activityType;

        const types = {
            'playing': 'Playing',
            'watching': 'Watching',
            'listening': 'Listening',
            'competing': 'Competing'
        };

        if (types[typeStr] !== undefined) {
            activityType = types[typeStr];
            args.shift(); // Remove the type from args so we only have the text
        } else {
            // Default to Playing if not specified or invalid
            activityType = 'Playing';
        }

        const statusText = args.join(' ');
        if (!statusText) {
            return message.reply(lang === 'vi' ? '❌ Vui lòng cung cấp nội dung trạng thái.\nVí dụ: `$setstatus playing Các trò chơi` hoặc `$setstatus watching Bạn`' : '❌ Please provide status text.\nExample: `$setstatus playing Games` or `$setstatus watching You`');
        }

        try {
            message.client.user.setActivity(statusText, { type: activityType });

            const typeNames = {
                ['Playing']: 'Playing',
                ['Watching']: 'Watching',
                ['Listening']: 'Listening',
                ['Competing']: 'Competing'
            };

            return message.reply(lang === 'vi' ? `Đã thay đổi trạng thái của bot thành:\n**${typeNames[activityType]} ${statusText}**` : `Changed bot status to:\n**${typeNames[activityType]} ${statusText}**`);
        } catch (e) {
            return message.reply(lang === 'vi' ? `❌ Lỗi cập nhật trạng thái: ${e.message}` : `❌ Error updating status: ${e.message}`);
        }
    }
};
