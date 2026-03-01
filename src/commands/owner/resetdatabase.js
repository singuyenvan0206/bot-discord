const db = require('../../database');
const config = require('../../config');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'resetdatabase',
    aliases: ['wipeall', 'dbreset', 'rdb', 'resetdb'],
    description: 'Đặt lại toàn bộ database (Reset entire database)',
    ownerOnly: true,
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = await getLanguage(message.author.id, message.guild?.id);

        // Require double confirmation for such a destructive action
        if (args[0] !== 'confirm' || args[1] !== 'YES') {
            return message.reply(lang === 'vi'
                ? 'Bạn đang chuẩn bị xóa **TOÀN BỘ** dữ liệu của bot (Tiền, Đồ, Cấp độ, Nghề nghiệp, Giveaway, v.v.).\n\n**HÀNH ĐỘNG NÀY KHÔNG THỂ KHÔI PHỤC!**\n\nHãy gõ lệnh: `$resetdatabase confirm YES` để tiếp tục.'
                : 'You are about to wipe **EVERYTHING** (Money, Items, Levels, Jobs, Giveaways, etc.).\n\n**THIS ACTION IS IRREVERSIBLE!**\n\nType: `$resetdatabase confirm YES` to proceed.')
        }

        try {
            db.clearAllData();
            message.client.cooldowns.clear();

            return message.reply(lang === 'vi' ? 'Đã xóa sạch toàn bộ dữ liệu hệ thống thành công.' : 'Successfully wiped all system data.')
        } catch (e) {
            return message.reply(lang === 'vi' ? `❌ Lỗi khi reset database: ${e.message}` : `❌ Error resetting database: ${e.message}`);
        }
    }
};
