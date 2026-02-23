const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'resetdatabase',
    aliases: ['wipeall', 'dbreset'],
    description: '[OWNER] Xóa toàn bộ dữ liệu người dùng và hệ thống',
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);

        // Require double confirmation for such a destructive action
        if (args[0] !== 'confirm' || args[1] !== 'YES') {
            const embed = new EmbedBuilder()
                .setTitle('⚠️ CẢNH BÁO NGUY HIỂM')
                .setDescription(lang === 'vi'
                    ? 'Bạn đang chuẩn bị xóa **TOÀN BỘ** dữ liệu của bot (Tiền, Đồ, Cấp độ, Nghề nghiệp, Giveaway, v.v.).\n\n**HÀNH ĐỘNG NÀY KHÔNG THỂ KHÔI PHỤC!**\n\nHãy gõ lệnh: `$resetdatabase confirm YES` để tiếp tục.'
                    : 'You are about to wipe **EVERYTHING** (Money, Items, Levels, Jobs, Giveaways, etc.).\n\n**THIS ACTION IS IRREVERSIBLE!**\n\nType: `$resetdatabase confirm YES` to proceed.')
                .setColor('#ff0000');

            return message.reply({ embeds: [embed] });
        }

        try {
            db.clearAllData();

            const embed = new EmbedBuilder()
                .setTitle('✅ Database Reset')
                .setDescription(lang === 'vi' ? 'Đã xóa sạch toàn bộ dữ liệu hệ thống thành công.' : 'Successfully wiped all system data.')
                .setColor(config.COLORS.SUCCESS)
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (e) {
            message.reply(lang === 'vi' ? `❌ Lỗi khi reset database: ${e.message}` : `❌ Error resetting database: ${e.message}`);
        }
    }
};
