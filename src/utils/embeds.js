const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, EMOJIS, BUTTON_ID } = require('../config');
const { t } = require('./i18n');
const EMOJI = EMOJIS.GIVEAWAY;

/**
 * Format a Unix timestamp into a Discord relative timestamp.
 */
function formatTimestamp(unixSeconds, style = 'R') {
    return `<t:${unixSeconds}:${style}>`;
}

/**
 * Format the remaining time as a human-readable string.
 */
function formatDuration(ms, lang = 'vi') {
    if (ms <= 0) return t('giveaway.already_ended', lang);

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const daysStr = days > 0 ? t('common.duration_days', lang, { days }) + ' ' : '';
    const hoursStr = (days > 0 || hours > 0) ? t('common.duration_hours', lang, { hours: hours % 24 }) + ' ' : '';
    const minutesStr = (days > 0 || hours > 0 || minutes > 0) ? t('common.duration_minutes', lang, { minutes: minutes % 60 }) + ' ' : '';
    const secondsStr = t('common.duration_seconds', lang, { seconds: seconds % 60 });

    return `${daysStr}${hoursStr}${minutesStr}${secondsStr}`.trim();
}

/**
 * Build the Enter Giveaway button row.
 */
function createEntryButton(disabled = false, lang = 'vi') {
    const button = new ButtonBuilder()
        .setCustomId(BUTTON_ID)
        .setLabel(t('giveaway.join_button', lang))
        .setEmoji(EMOJIS.GIVEAWAY)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled);

    return new ActionRowBuilder().addComponents(button);
}

/**
 * Build the main giveaway embed (active state).
 */
function createGiveawayEmbed(giveaway, participantCount = 0, lang = 'vi') {
    const timeLeft = giveaway.ends_at * 1000 - Date.now();
    const color = timeLeft < 60000 ? COLORS.ENDING_SOON : COLORS.ACTIVE;

    const embed = new EmbedBuilder()
        .setTitle(t('giveaway.active_title', lang, { emoji: EMOJIS.GIVEAWAY }))
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `⏰ ${t('giveaway.ends', lang)}: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 ${t('giveaway.winners', lang)}: **${giveaway.winner_count}**`,
            `👤 ${t('giveaway.host', lang)}: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 ${t('giveaway.required_role', lang)}: <@&${giveaway.required_role_id}>` : '',
            '',
            `📥 ${t('giveaway.entries', lang, { count: participantCount })}`,
            '',
            t('giveaway.join_instruction', lang, { emoji: EMOJI }),
        ].filter(Boolean).join('\n'))
        .setColor(color)
        .setFooter({ text: `${t('giveaway.footer_id', lang, { id: giveaway.message_id || '...' })}` })
        .setTimestamp(giveaway.ends_at * 1000);

    return embed;
}

/**
 * Build the paused giveaway embed.
 */
function createPausedEmbed(giveaway, participantCount = 0, lang = 'vi') {
    const embed = new EmbedBuilder()
        .setTitle(t('giveaway.paused_title', lang))
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `⏰ ${t('giveaway.ends', lang)}: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 ${t('giveaway.winners', lang)}: **${giveaway.winner_count}**`,
            `👤 ${t('giveaway.host', lang)}: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 ${t('giveaway.required_role', lang)}: <@&${giveaway.required_role_id}>` : '',
            '',
            `📥 ${t('giveaway.entries', lang, { count: participantCount })}`,
            '',
            t('giveaway.paused_desc', lang),
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.PAUSED)
        .setFooter({ text: `ID: ${giveaway.message_id} • ${t('giveaway.status_paused', lang)}` })
        .setTimestamp();

    return embed;
}

/**
 * Build the ended giveaway embed.
 */
function createEndedEmbed(giveaway, winners, participantCount = 0, lang = 'vi') {
    const winnerText = winners.length > 0
        ? winners.map(id => `<@${id}>`).join(', ')
        : t('giveaway.no_participants', lang);

    const embed = new EmbedBuilder()
        .setTitle(t('giveaway.ended_title', lang, { emoji: EMOJIS.GIVEAWAY }))
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `🏆 ${t('giveaway.ended_desc', lang, { winners: winnerText })}`,
            `👤 ${t('giveaway.host', lang)}: <@${giveaway.host_id}>`,
            '',
            `📥 ${t('giveaway.total_entries', lang, { count: participantCount })}`,
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.ENDED)
        .setFooter({ text: `${t('giveaway.footer_id', lang, { id: giveaway.message_id })}` })
        .setTimestamp(Date.now());

    return embed;
}

/**
 * Build a winner announcement embed.
 */
function createWinnerAnnouncementEmbed(giveaway, winners, lang = 'vi') {
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    return new EmbedBuilder()
        .setTitle(t('giveaway.congrats_title', lang))
        .setDescription([
            `${winnerMentions}`,
            '',
            t('giveaway.won_prize', lang, { prize: giveaway.prize }),
            '',
            `🎁 ${t('giveaway.host', lang)} <@${giveaway.host_id}>`,
        ].join('\n'))
        .setColor(COLORS.ENDED)
        .setTimestamp(Date.now());
}

/**
 * Build a detailed info/stats embed for a giveaway.
 */
function createInfoStatsEmbed(giveaway, participantCount, totalEntries, lang = 'vi') {
    const isActive = !giveaway.ended && !giveaway.paused;
    const isPaused = giveaway.paused && !giveaway.ended;
    const isEnded = giveaway.ended;

    let status = t('giveaway.status_active', lang);
    let color = COLORS.ACTIVE;
    if (isPaused) { status = t('giveaway.status_paused', lang); color = COLORS.PAUSED; }
    if (isEnded) { status = t('giveaway.status_ended', lang); color = COLORS.ENDED; }

    const timeLeft = giveaway.ends_at * 1000 - Date.now();

    const embed = new EmbedBuilder()
        .setTitle(t('giveaway.stats_title', lang))
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            giveaway.description ? `> ${giveaway.description}` : '',
        ].filter(Boolean).join('\n'))
        .addFields(
            { name: t('giveaway.status', lang), value: status, inline: true },
            { name: t('giveaway.winners', lang), value: `${giveaway.winner_count}`, inline: true },
            { name: t('giveaway.host', lang), value: `<@${giveaway.host_id}>`, inline: true },
            { name: t('giveaway.entries', lang, { count: participantCount }), value: `${totalEntries.toLocaleString()} (with bonus)`, inline: true },
            { name: t('giveaway.time_left', lang), value: isEnded ? t('giveaway.status_ended', lang) : `${formatTimestamp(giveaway.ends_at)} (${formatDuration(timeLeft, lang)})`, inline: true },
            { name: t('giveaway.required_role', lang), value: giveaway.required_role_id ? `<@&${giveaway.required_role_id}>` : t('help.none', lang), inline: true },
        )
        .setColor(color)
        .setFooter({ text: `ID: ${giveaway.message_id}` })
        .setTimestamp();

    return embed;
}

/**
 * Build a scheduled giveaway embed (not yet started).
 */
function createScheduledEmbed(giveaway, lang = 'vi') {
    const embed = new EmbedBuilder()
        .setTitle(t('giveaway.scheduled_title', lang))
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `📅 ${t('giveaway.starts', lang)}: ${formatTimestamp(giveaway.scheduled_start)} (${formatTimestamp(giveaway.scheduled_start, 'f')})`,
            `⏰ ${t('giveaway.ends', lang)}: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 ${t('giveaway.winners', lang)}: **${giveaway.winner_count}**`,
            `👤 ${t('giveaway.host', lang)}: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 ${t('giveaway.required_role', lang)}: <@&${giveaway.required_role_id}>` : '',
            '',
            t('giveaway.scheduled_desc', lang),
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.SCHEDULED)
        .setFooter({ text: `ID: ${giveaway.message_id || '...'} • ${t('giveaway.starts', lang)}` })
        .setTimestamp(giveaway.scheduled_start * 1000);

    return embed;
}

/**
 * Build an error embed.
 */
function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setDescription(`${EMOJIS.ERROR} ${message}`)
        .setColor(COLORS.ERROR);
}

/**
 * Build an info/success embed.
 */
function createInfoEmbed(message) {
    return new EmbedBuilder()
        .setDescription(`${EMOJIS.SUCCESS} ${message}`)
        .setColor(COLORS.INFO);
}

module.exports = {
    COLORS,
    EMOJI,
    BUTTON_ID,
    formatTimestamp,
    formatDuration,
    createEntryButton,
    createGiveawayEmbed,
    createPausedEmbed,
    createEndedEmbed,
    createWinnerAnnouncementEmbed,
    createInfoStatsEmbed,
    createScheduledEmbed,
    createErrorEmbed,
    createInfoEmbed,
};
