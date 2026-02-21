const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'addmoney',
    aliases: ['am'],
    description: '[OWNER] Thêm tiền cho người dùng',
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!target) return message.reply(`❌ ${t('common.user_not_found', lang) || 'Không tìm thấy người dùng.'}`);

        const amountStr = args[1] || (message.mentions.users.first() ? args[1] : args[0]);
        const amount = parseAmount(amountStr, Infinity);

        if (isNaN(amount) || amount <= 0) return message.reply(lang === 'vi' ? `❌ Số tiền không hợp lệ.` : `❌ Invalid amount.`);

        db.addBalance(target.id, amount);
        const user = db.getUser(target.id);

        const embed = new EmbedBuilder()
            .setTitle('💰 Add Money')
            .setDescription(lang === 'vi' ? `Đã thêm **${amount.toLocaleString()}** ${config.EMOJIS.COIN} cho <@${target.id}>.\nSố dư hiện tại: **${user.balance.toLocaleString()}**` : `Added **${amount.toLocaleString()}** ${config.EMOJIS.COIN} to <@${target.id}>.\nCurrent balance: **${user.balance.toLocaleString()}**`)
            .setColor(config.COLORS.SUCCESS);

        message.reply({ embeds: [embed] });
    }
};
