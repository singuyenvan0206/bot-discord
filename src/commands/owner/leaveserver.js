const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'leaveserver',
    aliases: ['leaveguild'],
    description: '[OWNER] Rời khỏi một máy chủ cụ thể',
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);

        const guildId = args[0];
        if (!guildId) return message.reply(lang === 'vi' ? '❌ Vui lòng nhập ID của máy chủ cần rời.' : '❌ Please provide the ID of the server to leave.');

        const guildToLeave = message.client.guilds.cache.get(guildId);
        if (!guildToLeave) {
            return message.reply(lang === 'vi' ? `❌ Sinh tử lệnh thất bại: Bot hiện không nằm trong máy chủ có ID \`${guildId}\`.` : `❌ Leave command failed: Bot is not in a server with ID \`${guildId}\`.`);
        }

        try {
            const name = guildToLeave.name;
            await guildToLeave.leave();

            const embed = new EmbedBuilder()
                .setTitle('🚪 Leave Server')
                .setDescription(lang === 'vi' ? `Đã chủ động rời khỏi máy chủ **${name}** (\`${guildId}\`).` : `Successfully left server **${name}** (\`${guildId}\`).`)
                .setColor(config.COLORS.SUCCESS);

            message.reply({ embeds: [embed] });
        } catch (e) {
            message.reply(lang === 'vi' ? `❌ Lỗi khi cố gắng rời máy chủ: ${e.message}` : `❌ Error attempting to leave server: ${e.message}`);
        }
    }
};
