const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'startup',
    aliases: ['boot', 'poweron'],
    description: '[OWNER] Khởi động lại hệ thống lệnh (Re-enable command system)',
    ownerOnly: true,
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = getLanguage(message.author.id, message.guild?.id);

        // Reset the stopped flag
        db.setGlobalSetting('bot_is_stopped', 'false');

        const embed = new EmbedBuilder()
            .setTitle('⚡ System Startup')
            .setDescription(lang === 'vi' ? `**Hệ thống đã sẵn sàng!**\nBot đã quay trở lại phục vụ . 🚀` : `**System is online!**\nBot is back at your service. 🚀`)
            .setColor(config.COLORS.SUCCESS)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        console.log(`[STARTUP] Re-enabled by owner (${message.author.tag})`);
    }
};
