const { EmbedBuilder, ActivityType } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'setstatus',
    aliases: ['setactivity', 'ss'],
    description: '[OWNER] Chỉnh sửa trạng thái Custom Activity của bot',
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);

        const typeStr = args[0]?.toLowerCase();
        let activityType;

        const types = {
            'playing': ActivityType.Playing,
            'watching': ActivityType.Watching,
            'listening': ActivityType.Listening,
            'competing': ActivityType.Competing
        };

        if (types[typeStr] !== undefined) {
            activityType = types[typeStr];
            args.shift(); // Remove the type from args so we only have the text
        } else {
            // Default to Playing if not specified or invalid
            activityType = ActivityType.Playing;
        }

        const statusText = args.join(' ');
        if (!statusText) {
            return message.reply(lang === 'vi' ? '❌ Vui lòng cung cấp nội dung trạng thái.\nVí dụ: `$setstatus playing Các trò chơi` hoặc `$setstatus watching Bạn`' : '❌ Please provide status text.\nExample: `$setstatus playing Games` or `$setstatus watching You`');
        }

        try {
            message.client.user.setActivity(statusText, { type: activityType });

            const typeNames = {
                [ActivityType.Playing]: 'Playing',
                [ActivityType.Watching]: 'Watching',
                [ActivityType.Listening]: 'Listening',
                [ActivityType.Competing]: 'Competing'
            };

            const embed = new EmbedBuilder()
                .setTitle(lang === 'vi' ? '📱 Cập nhật trạng thái' : '📱 Status Updated')
                .setDescription(lang === 'vi' ? `Đã thay đổi trạng thái của bot thành:\n**${typeNames[activityType]} ${statusText}**` : `Changed bot status to:\n**${typeNames[activityType]} ${statusText}**`)
                .setColor(config.COLORS.SUCCESS);

            message.reply({ embeds: [embed] });
        } catch (e) {
            message.reply(lang === 'vi' ? `❌ Lỗi cập nhật trạng thái: ${e.message}` : `❌ Error updating status: ${e.message}`);
        }
    }
};
