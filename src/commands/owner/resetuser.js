const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'resetuser',
    aliases: ['wipeuser', 'ru'],
    description: '[OWNER] Xóa toàn bộ dữ liệu của người dùng',
    ownerOnly: true,
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!target) return message.reply(`❌ ${t('common.user_not_found', lang) || 'Không tìm thấy người dùng.'}`);

        // Require confirmation to prevent accidents
        if (args[1] !== 'confirm') {
            return message.reply(lang === 'vi' ? `⚠️ Bạn đang chuẩn bị xóa **TOÀN BỘ** dữ liệu của <@${target.id}> (tiền, đồ, cấp độ, v.v.).\nHãy gõ lệnh \`$resetuser ${target.id} confirm\` để xác nhận.` : `⚠️ You are about to wipe **ALL** data for <@${target.id}> (money, items, level, etc.).\nType \`$resetuser ${target.id} confirm\` to proceed.`);
        }

        try {
            // Need to get access to direct DB execution, database.js doesn't export execute()
            // We can cheat by using updateUser to set everything to 0
            db.updateUser(target.id, {
                balance: 0,
                xp: 0,
                level: 0,
                last_daily: 0,
                last_work: 0,
                last_rob: 0,
                last_crime: 0,
                last_slut: 0,
                last_beg: 0,
                last_search: 0,
                job: null,
                inventory: '{}'
            });

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Reset User')
                .setDescription(lang === 'vi' ? `Đã xóa sạch mọi dữ liệu của <@${target.id}>.` : `Wiped all data for <@${target.id}>.`)
                .setColor(config.COLORS.ERROR);

            message.reply({ embeds: [embed] });
        } catch (e) {
            message.reply(lang === 'vi' ? `❌ Lỗi khi xóa dữ liệu: ${e.message}` : `❌ Error wiping data: ${e.message}`);
        }
    }
};
