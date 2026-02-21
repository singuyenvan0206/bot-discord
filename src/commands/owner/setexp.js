const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const { calculateLevel } = require('../../utils/leveling');

module.exports = {
    name: 'setexp',
    aliases: ['se', 'setxp'],
    description: '[OWNER] Chỉnh sửa điểm kinh nghiệm của người chơi',
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        const xp = parseInt(args[1]);

        if (!target) return message.reply(`❌ ${lang === 'vi' ? 'Không tìm thấy người dùng.' : 'User not found.'}`);
        if (isNaN(xp) || xp < 0) return message.reply(lang === 'vi' ? '❌ XP không hợp lệ. Phải là số >= 0.' : '❌ Invalid XP. Must be a non-negative number.');

        try {
            // Calculate the level that corresponds to the given XP
            const newLevel = calculateLevel(xp);

            db.updateUser(target.id, {
                xp: xp,
                level: newLevel
            });

            const embed = new EmbedBuilder()
                .setTitle('⭐ Set XP')
                .setDescription(lang === 'vi'
                    ? `Đã đặt XP của <@${target.id}> thành **${xp.toLocaleString()}** (Cấp độ: **${newLevel}**).`
                    : `Set <@${target.id}>'s XP to **${xp.toLocaleString()}** (Level: **${newLevel}**).`)
                .setColor(config.COLORS.SUCCESS);

            message.reply({ embeds: [embed] });
        } catch (e) {
            message.reply(lang === 'vi' ? `❌ Lỗi khi đổi XP: ${e.message}` : `❌ Error setting XP: ${e.message}`);
        }
    }
};
