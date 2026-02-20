const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { COLORS, EMOJIS, BUTTON_ID } = require('../config');
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
function formatDuration(ms) {
    if (ms <= 0) return 'Ended';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

/**
 * Build the Enter Giveaway button row.
 */
function createEntryButton(disabled = false) {
    const button = new ButtonBuilder()
        .setCustomId(BUTTON_ID)
        .setLabel('Enter Giveaway')
        .setEmoji(EMOJIS.GIVEAWAY)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled);

    return new ActionRowBuilder().addComponents(button);
}

/**
 * Build the main giveaway embed (active state).
 */
function createGiveawayEmbed(giveaway, participantCount = 0) {
    const timeLeft = giveaway.ends_at * 1000 - Date.now();
    const color = timeLeft < 60000 ? COLORS.ENDING_SOON : COLORS.ACTIVE;

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.GIVEAWAY}  GIVEAWAY  ${EMOJIS.GIVEAWAY}`)
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `⏰ Ends: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 Winners: **${giveaway.winner_count}**`,
            `👤 Hosted by: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 Required role: <@&${giveaway.required_role_id}>` : '',
            '',
            `📥 **${participantCount}** entr${participantCount === 1 ? 'y' : 'ies'}`,
            '',
            `React with ${EMOJI} or click the button to enter!`,
        ].filter(Boolean).join('\n'))
        .setColor(color)
        .setFooter({ text: `Giveaway ID: ${giveaway.message_id || 'pending'} • Ends at` })
        .setTimestamp(giveaway.ends_at * 1000);

    return embed;
}

/**
 * Build the paused giveaway embed.
 */
function createPausedEmbed(giveaway, participantCount = 0) {
    const embed = new EmbedBuilder()
        .setTitle('⏸️  GIVEAWAY PAUSED  ⏸️')
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `⏰ Ends: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 Winners: **${giveaway.winner_count}**`,
            `👤 Hosted by: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 Required role: <@&${giveaway.required_role_id}>` : '',
            '',
            `📥 **${participantCount}** entr${participantCount === 1 ? 'y' : 'ies'}`,
            '',
            '🟡 **This giveaway is currently paused.** Entries are not being accepted.',
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.PAUSED)
        .setFooter({ text: `Giveaway ID: ${giveaway.message_id} • Paused` })
        .setTimestamp();

    return embed;
}

/**
 * Build the ended giveaway embed.
 */
function createEndedEmbed(giveaway, winners, participantCount = 0) {
    const winnerText = winners.length > 0
        ? winners.map(id => `<@${id}>`).join(', ')
        : 'No valid entries — no winners could be determined.';

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.GIVEAWAY}  GIVEAWAY ENDED  ${EMOJIS.GIVEAWAY}`)
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `🏆 Winner${winners.length !== 1 ? 's' : ''}: ${winnerText}`,
            `👤 Hosted by: <@${giveaway.host_id}>`,
            '',
            `📥 Total entries: **${participantCount}**`,
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.ENDED)
        .setFooter({ text: `Giveaway ID: ${giveaway.message_id} • Ended at` })
        .setTimestamp(Date.now());

    return embed;
}

/**
 * Build a winner announcement embed.
 */
function createWinnerAnnouncementEmbed(giveaway, winners) {
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    return new EmbedBuilder()
        .setTitle('🏆  Congratulations!  🏆')
        .setDescription([
            `${winnerMentions}`,
            '',
            `You won **${giveaway.prize}**!`,
            '',
            `🎁 Hosted by <@${giveaway.host_id}>`,
        ].join('\n'))
        .setColor(COLORS.ENDED)
        .setTimestamp(Date.now());
}

/**
 * Build a detailed info/stats embed for a giveaway.
 */
function createInfoStatsEmbed(giveaway, participantCount, totalEntries) {
    const isActive = !giveaway.ended && !giveaway.paused;
    const isPaused = giveaway.paused && !giveaway.ended;
    const isEnded = giveaway.ended;

    let status = '🟢 Active';
    let color = COLORS.ACTIVE;
    if (isPaused) { status = '🟡 Paused'; color = COLORS.PAUSED; }
    if (isEnded) { status = '🔴 Ended'; color = COLORS.ENDED; }

    const timeLeft = giveaway.ends_at * 1000 - Date.now();

    const embed = new EmbedBuilder()
        .setTitle(`📊  Giveaway Info`)
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            giveaway.description ? `> ${giveaway.description}` : '',
        ].filter(Boolean).join('\n'))
        .addFields(
            { name: '📋 Status', value: status, inline: true },
            { name: '🏆 Winners', value: `${giveaway.winner_count}`, inline: true },
            { name: '👤 Host', value: `<@${giveaway.host_id}>`, inline: true },
            { name: '📥 Entries', value: `${participantCount} users (${totalEntries} total with bonus)`, inline: true },
            { name: '⏰ Ends', value: isEnded ? 'Ended' : `${formatTimestamp(giveaway.ends_at)} (${formatDuration(timeLeft)})`, inline: true },
            { name: '🔒 Required Role', value: giveaway.required_role_id ? `<@&${giveaway.required_role_id}>` : 'None', inline: true },
        )
        .setColor(color)
        .setFooter({ text: `Giveaway ID: ${giveaway.message_id}` })
        .setTimestamp();

    return embed;
}

/**
 * Build a scheduled giveaway embed (not yet started).
 */
function createScheduledEmbed(giveaway) {
    const embed = new EmbedBuilder()
        .setTitle('⏳  GIVEAWAY — COMING SOON  ⏳')
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `📅 Starts: ${formatTimestamp(giveaway.scheduled_start)} (${formatTimestamp(giveaway.scheduled_start, 'f')})`,
            `⏰ Ends: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 Winners: **${giveaway.winner_count}**`,
            `👤 Hosted by: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 Required role: <@&${giveaway.required_role_id}>` : '',
            '',
            '⏳ **This giveaway has not started yet.** Stay tuned!',
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.SCHEDULED)
        .setFooter({ text: `Giveaway ID: ${giveaway.message_id || 'pending'} • Starts at` })
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
