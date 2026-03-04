const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const { getCurrentEvent } = require('../../utils/eventSystem');
const config = require('../../config');

module.exports = {
    name: 'event',
    aliases: ['ev', 'su kien'],
    description: 'Xem sự kiện kinh tế hiện tại (View current economic event)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const event = await getCurrentEvent();

        if (event.id === 'none') {
            return message.reply(t('event.none_desc', lang));
        }

        const name = t(`event.name_${event.id}`, lang);
        const description = t(`event.desc_${event.id}`, lang);

        const hours = Math.floor(event.remaining / 3600);
        const minutes = Math.floor((event.remaining % 3600) / 60);
        const timeStr = `${hours}h ${minutes}m`;

        const embed = new EmbedBuilder()
            .setTitle(`${event.icon} ${name}`)
            .setDescription(description)
            .setColor(event.color)
            .addFields(
                { name: '⏱️ ' + t('event.duration', lang), value: `\`${timeStr}\``, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: t('event.footer', lang) });

        return message.reply({ embeds: [embed] });
    }
};
