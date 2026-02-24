const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'setlevel',
    aliases: ['sl'],
    description: '[OWNER] Chỉnh sửa cấp độ của người chơi',
    ownerOnly: true,
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        const level = parseInt(args[1]);

        if (!target) return message.reply(`❌ ${t('common.user_not_found', lang) || 'Không tìm thấy người dùng.'}`);
        if (isNaN(level) || level < 0) return message.reply(lang === 'vi' ? '❌ Cấp độ không hợp lệ.' : '❌ Invalid level.');

        try {
            // Need to set the XP so it matches the new level, based on the formula: XP = (Level / 0.1)^2
            const newXp = Math.floor(Math.pow(level / 0.1, 2));

            db.updateUser(target.id, {
                level: level,
                xp: newXp
            });

            const embed = new EmbedBuilder()
                .setTitle('🆙 Set Level')
                .setDescription(lang === 'vi' ? `Đã đặt cấp độ của <@${target.id}> thành **${level}** (XP: ${newXp}).` : `Set <@${target.id}>'s level to **${level}** (XP: ${newXp}).`)
                .setColor(config.COLORS.SUCCESS);

            message.reply({ embeds: [embed] });
        } catch (e) {
            message.reply(lang === 'vi' ? `❌ Lỗi khi đổi cấp độ: ${e.message}` : `❌ Error setting level: ${e.message}`);
        }
    }
};
