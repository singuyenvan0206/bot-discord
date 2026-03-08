const { EmbedBuilder } = require('discord.js');
const { getCurrentEvent, rotateEvent, EVENTS } = require('../../utils/eventSystem');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const db = require('../../database');

module.exports = {
    name: 'events',
    aliases: ['event', 'ev'],
    description: 'Xem sự kiện và thông tin bot (View server events and bot info)',
    cooldown: 5,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const guildId = message.guild.id;

        // Admin/Owner can rotate event
        if (args[0] === 'rotate' && (message.author.id === config.OWNER_ID || (message.member && message.member.permissions.has('Administrator')))) {
            const nextEventId = await rotateEvent(guildId, message.client);
            return message.reply(t('events.rotate_success', lang, { event: t(`events.${nextEventId}`, lang) }));
        }

        const event = await getCurrentEvent(guildId);

        // Bot info for this server
        const botBalance = await db.getGuildSetting(guildId, 'bot_balance', 0);
        const botLevel = await db.getGuildSetting(guildId, 'bot_level', 0);

        const embed = new EmbedBuilder()
            .setTitle(t('events.current_event_title', lang))
            .setColor(event.color || config.COLORS.INFO)
            .setThumbnail(message.client.user.displayAvatarURL())
            .setTimestamp();

        // Bot Stats Section
        embed.addFields({
            name: `🤖 ${message.client.user.username} Info`,
            value: `💰 **Fund:** ${botBalance.toLocaleString()} ${config.EMOJIS.COIN}\n⭐ **Level:** ${botLevel}`,
            inline: false
        });

        if (event.id === 'none') {
            embed.setDescription(`**${t('events.no_event', lang)}**`);
        } else {
            const name = t(`events.name_${event.id}`, lang);
            const desc = t(`events.desc_${event.id}`, lang);

            let timeStr = '';
            if (event.remaining > 0) {
                const hours = Math.floor(event.remaining / 3600);
                const minutes = Math.floor((event.remaining % 3600) / 60);
                const seconds = event.remaining % 60;

                const timeArr = [];
                if (hours > 0) timeArr.push(t('common.duration_hours', lang, { hours }));
                if (minutes > 0) timeArr.push(t('common.duration_minutes', lang, { minutes }));
                if (seconds > 0 || timeArr.length === 0) timeArr.push(t('common.duration_seconds', lang, { seconds }));

                timeStr = `\n\n⌛ **${t('events.ends_in', lang, { time: timeArr.join(' ') })}**`;
            }

            embed.setDescription(`${event.icon} **${name}**\n${desc}${timeStr}`);
        }

        // Show all possible events as info
        const eventList = Object.values(EVENTS)
            .filter(e => e.id !== 'none')
            .map(e => `• ${e.icon} **${t(`events.name_${e.id}`, lang)}**: ${t(`events.desc_${e.id}`, lang)}`)
            .join('\n');

        embed.addFields({ name: t('events.event_list_title', lang), value: eventList });

        return message.reply({ embeds: [embed] });
    }
};
