const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'support',
    aliases: ['ungho'],
    description: 'Ủng hộ (Support developer)',
    cooldown: 5,
    skipXp: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        const assetPath = path.join(process.cwd(), 'src', 'assets', 'support', 'support_qr.png');
        const attachment = new AttachmentBuilder(assetPath, { name: 'support_qr.png' });

        const embed = new EmbedBuilder()
            .setTitle(t('fish.support.title', lang))
            .setDescription(t('fish.support.description', lang))
            .setColor(config.COLORS.INFO)
            .setImage('attachment://support_qr.png')
            .setFooter({ text: t('fish.support.footer', lang) })
            .setTimestamp();

        message.reply({ embeds: [embed], files: [attachment] });
    }
};
