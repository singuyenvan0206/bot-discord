const db = require('../../database');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'resetuser',
    aliases: ['wipeuser', 'ureset', 'resetp', 'ru'],
    description: 'Đặt lại dữ liệu của một người dùng (Reset a user\'s data)',
    ownerOnly: true,
    usage: '<@user> [confirm]',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) return message.reply(  lang === 'vi' ? '❌ Vui lòng nhập ID của người dùng cần reset.' : '❌ Please provide the ID of the user to reset.');

        // Require confirmation
        if (args[1] !== 'confirm') {
            return message.reply(lang === 'vi'
                ? `Bạn đang chuẩn bị xóa **TẤT CẢ** dữ liệu của **${target.username}** (Tiền, Đồ, Cấp độ, Nghề nghiệp).\n\n**HÀNH ĐỘNG NÀY KHÔNG THỂ KHÔI PHỤC!**\n\nHãy gõ lệnh: \`$resetuser ${target.id} confirm\` để tiếp tục.`
                : `You are about to wipe **ALL** data for **${target.username}** (Money, Items, Levels, Jobs).\n\n**THIS ACTION IS IRREVERSIBLE!**\n\nType: \`$resetuser ${target.id} confirm\` to proceed.`);
        }

        try {
            db.resetUser(target.id);

            // Clear in-memory cooldowns if applicable
            if (message.client.cooldowns) {
                // Find and remove all cooldowns for this user
                for (const [cmdName, cooldownMap] of message.client.cooldowns) {
                    if (cooldownMap.has(target.id)) {
                        cooldownMap.delete(target.id);
                    }
                }
            }

            return message.reply(lang === 'vi'
                ? `Đã xóa sạch dữ liệu của **${target.username}** thành công.`
                : `Successfully wiped all data for **${target.username}**.`);
        } catch (e) {
            return message.reply(lang === 'vi' ? `❌ Lỗi khi reset người dùng: ${e.message}` : `❌ Error resetting user: ${e.message}`);
        }
    }
};
