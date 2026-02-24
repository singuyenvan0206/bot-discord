const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const items = require('../../utils/shopItems');

module.exports = {
    name: 'removeitem',
    aliases: ['ri', 'takeitem'],
    description: '[OWNER] Xóa vật phẩm khỏi kho đồ (Remove item from user inventory)',
    ownerOnly: true,
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!target) return message.reply(`❌ ${t('common.user_not_found', lang) || 'Không tìm thấy người dùng.'}`);

        const itemQuery = args[1]?.toLowerCase();
        if (!itemQuery) return message.reply(lang === 'vi' ? `❌ Vui lòng nhập ID hoặc tên vật phẩm.` : `❌ Please enter an item ID or name.`);

        const item = items.find(i => String(i.id) === itemQuery || i.name.toLowerCase().includes(itemQuery));
        if (!item) return message.reply(lang === 'vi' ? `❌ Không tìm thấy vật phẩm nào khớp với \`${itemQuery}\`.` : `❌ Could not find an item matching \`${itemQuery}\`.`);

        const amount = args[2] ? parseInt(args[2]) : 1;
        if (isNaN(amount) || amount <= 0) return message.reply(lang === 'vi' ? `❌ Số lượng không hợp lệ.` : `❌ Invalid amount.`);

        const success = db.removeItem(target.id, item.id, amount);

        if (!success) {
            return message.reply(lang === 'vi' ? `❌ Người dùng này không có đủ **${item.name}** để thu hồi.` : `❌ This user does not have enough **${item.name}** to remove.`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🎒 Remove Item')
            .setDescription(lang === 'vi' ? `Đã thu hồi **${amount}x** ${item.emoji || ''} **${item.name}** từ túi đồ của <@${target.id}>.` : `Removed **${amount}x** ${item.emoji || ''} **${item.name}** from <@${target.id}>'s inventory.`)
            .setColor(config.COLORS.ERROR);

        message.reply({ embeds: [embed] });
    }
};
