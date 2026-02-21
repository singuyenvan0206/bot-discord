const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'removemoney',
    aliases: ['rm'],
    description: '[OWNER] Trừ tiền của người dùng',
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!target) return message.reply(`❌ ${t('common.user_not_found', lang) || 'Không tìm thấy người dùng.'}`);

        const amountStr = args[1] || (message.mentions.users.first() ? args[1] : args[0]);
        const user = db.getUser(target.id);
        const amount = parseAmount(amountStr, user.balance);

        if (isNaN(amount) || amount <= 0) return message.reply(lang === 'vi' ? `❌ Số tiền không hợp lệ.` : `❌ Invalid amount.`);

        db.removeBalance(target.id, amount);
        const updatedUser = db.getUser(target.id);

        const embed = new EmbedBuilder()
            .setTitle('💸 Remove Money')
            .setDescription(lang === 'vi' ? `Đã trừ **${amount.toLocaleString()}** ${config.EMOJIS.COIN} của <@${target.id}>.\nSố dư hiện tại: **${updatedUser.balance.toLocaleString()}**` : `Removed **${amount.toLocaleString()}** ${config.EMOJIS.COIN} from <@${target.id}>.\nCurrent balance: **${updatedUser.balance.toLocaleString()}**`)
            .setColor(config.COLORS.ERROR);

        message.reply({ embeds: [embed] });
    }
};
