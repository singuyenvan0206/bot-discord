const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'shutdown',
    aliases: ['poweroff', 'kill', 'sd'],
    description: '[OWNER] Tắt tiến trình bot ngay lập tức',
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);

        const embed = new EmbedBuilder()
            .setTitle('🔌 System Shutdown')
            .setDescription(lang === 'vi' ? `**Bot đang tiến hành sập nguồn theo lệnh của Owner.**\nTạm biệt! 👋` : `**Bot is shutting down by Owner command.**\nGoodbye! 👋`)
            .setColor(config.COLORS.ERROR)
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        console.log(`[SHUTDOWN] Initiated by owner (${message.author.tag}) at ${new Date().toISOString()}`);

        // Let the message send before exiting
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
};
