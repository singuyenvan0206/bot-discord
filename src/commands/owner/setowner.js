const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const fs = require('fs');
const path = require('path');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'setowner',
    aliases: ['changeowner', 'transferowner', 'so'],
    description: '[OWNER] Chuyển nhượng quyền Owner cho người khác',
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);

        const target = message.mentions.users.first() || message.client.users.cache.get(args[0]);
        if (!target) return message.reply(lang === 'vi' ? `❌ Vui lòng tag hoặc nhập ID của người bạn muốn chuyển nhượng quyền Owner.` : `❌ Please mention or enter the ID of the user you want to transfer Owner rights to.`);

        if (target.id === message.author.id) {
            return message.reply(lang === 'vi' ? `❌ Bạn hiện đã là Owner rồi.` : `❌ You are already the Owner.`);
        }

        if (target.bot) {
            return message.reply(lang === 'vi' ? `❌ Không thể chuyển quyền Owner cho Bot.` : `❌ Cannot transfer Owner rights to a Bot.`);
        }

        // Require confirmation to prevent extremely bad accidents
        if (args[1] !== 'confirm') {
            return message.reply(lang === 'vi' ? `⚠️ **CẢNH BÁO TỐI CAO:** Bạn đang chuẩn bị chuyển nhượng toàn quyền kiểm soát Bot này cho <@${target.id}>.\nSau khi thực hiện, **bạn sẽ mất toàn bộ quyền Owner** và không thể lấy lại bằng lệnh được nữa.\n\nHãy gõ lệnh \`$setowner ${target.id} confirm\` để xác nhận.` : `⚠️ **ULTIMATE WARNING:** You are about to transfer full control of this bot to <@${target.id}>.\nAfter this, **you will lose all Owner privileges** and cannot regain them via commands.\n\nType \`$setowner ${target.id} confirm\` to proceed.`);
        }

        try {
            const envPath = path.resolve(__dirname, '../../..', '.env');
            if (!fs.existsSync(envPath)) {
                return message.reply(lang === 'vi' ? `❌ Không tìm thấy file \`.env\`. Không thể thay đổi Owner vĩnh viễn.` : `❌ \`.env\` file not found. Cannot permanently change Owner.`);
            }

            let envContent = fs.readFileSync(envPath, 'utf8');

            // Replace the OWNER_ID line
            const regex = /^OWNER_ID=.*$/m;
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `OWNER_ID=${target.id}`);
            } else {
                envContent += `\nOWNER_ID=${target.id}`;
            }

            // Write back to .env
            fs.writeFileSync(envPath, envContent);

            // Update in memory so it applies immediately without restarting
            process.env.OWNER_ID = target.id;

            const embed = new EmbedBuilder()
                .setTitle('👑 Owner Transferred')
                .setDescription(lang === 'vi' ? `Quyền lực tối cao đã được chuyển giao!\n<@${target.id}> hiện là **Owner duy nhất** của Bot.` : `Supreme authority transferred!\n<@${target.id}> is now the **sole Owner** of the Bot.`)
                .setColor(config.COLORS.SUCCESS)
                .setFooter({ text: lang === 'vi' ? 'Quyền Owner của bạn đã bị thu hồi.' : 'Your Owner privileges have been revoked.' });

            message.reply({ embeds: [embed] });
        } catch (e) {
            message.reply(lang === 'vi' ? `❌ Lỗi khi chuyển nhượng: ${e.message}` : `❌ Transfer error: ${e.message}`);
        }
    }
};
