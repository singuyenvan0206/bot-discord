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
    if (ms <= 0) return 'Đã kết thúc';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày ${hours % 24} giờ ${minutes % 60} phút`;
    if (hours > 0) return `${hours} giờ ${minutes % 60} phút ${seconds % 60} giây`;
    if (minutes > 0) return `${minutes} phút ${seconds % 60} giây`;
    return `${seconds} giây`;
}

/**
 * Build the Enter Giveaway button row.
 */
function createEntryButton(disabled = false) {
    const button = new ButtonBuilder()
        .setCustomId(BUTTON_ID)
        .setLabel('Tham gia ngay')
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
        .setTitle(`${EMOJIS.GIVEAWAY}  SỰ KIỆN GIVEAWAY  ${EMOJIS.GIVEAWAY}`)
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `⏰ Kết thúc: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 Số người thắng: **${giveaway.winner_count}**`,
            `👤 Người tổ chức: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 Vai trò yêu cầu: <@&${giveaway.required_role_id}>` : '',
            '',
            `📥 **${participantCount}** lượt tham gia`,
            '',
            `Thả cảm xúc ${EMOJI} hoặc nhấn nút bên dưới để tham gia!`,
        ].filter(Boolean).join('\n'))
        .setColor(color)
        .setFooter({ text: `ID: ${giveaway.message_id || 'đang tạo'} • Kết thúc lúc` })
        .setTimestamp(giveaway.ends_at * 1000);

    return embed;
}

/**
 * Build the paused giveaway embed.
 */
function createPausedEmbed(giveaway, participantCount = 0) {
    const embed = new EmbedBuilder()
        .setTitle('⏸️  GIVEAWAY ĐÃ TẠM DỪNG  ⏸️')
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `⏰ Kết thúc: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 Số người thắng: **${giveaway.winner_count}**`,
            `👤 Người tổ chức: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 Vai trò yêu cầu: <@&${giveaway.required_role_id}>` : '',
            '',
            `📥 **${participantCount}** lượt tham gia`,
            '',
            '🟡 **Giveaway này hiện đang tạm dừng.** Không thể tham gia lúc này.',
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.PAUSED)
        .setFooter({ text: `ID: ${giveaway.message_id} • Đã tạm dừng` })
        .setTimestamp();

    return embed;
}

/**
 * Build the ended giveaway embed.
 */
function createEndedEmbed(giveaway, winners, participantCount = 0) {
    const winnerText = winners.length > 0
        ? winners.map(id => `<@${id}>`).join(', ')
        : 'Không có người tham gia hợp lệ — không thể xác định người thắng.';

    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.GIVEAWAY}  GIVEAWAY ĐÃ KẾT THÚC  ${EMOJIS.GIVEAWAY}`)
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `🏆 Người chiến thắng: ${winnerText}`,
            `👤 Người tổ chức: <@${giveaway.host_id}>`,
            '',
            `📥 Tổng cộng: **${participantCount}** lượt tham gia`,
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.ENDED)
        .setFooter({ text: `ID: ${giveaway.message_id} • Kết thúc lúc` })
        .setTimestamp(Date.now());

    return embed;
}

/**
 * Build a winner announcement embed.
 */
function createWinnerAnnouncementEmbed(giveaway, winners) {
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    return new EmbedBuilder()
        .setTitle('🏆  Xin chúc mừng!  🏆')
        .setDescription([
            `${winnerMentions}`,
            '',
            `Bạn đã thắng phần quà **${giveaway.prize}**!`,
            '',
            `🎁 Tổ chức bởi <@${giveaway.host_id}>`,
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

    let status = '🟢 Đang diễn ra';
    let color = COLORS.ACTIVE;
    if (isPaused) { status = '🟡 Tạm dừng'; color = COLORS.PAUSED; }
    if (isEnded) { status = '🔴 Đã kết thúc'; color = COLORS.ENDED; }

    const timeLeft = giveaway.ends_at * 1000 - Date.now();

    const embed = new EmbedBuilder()
        .setTitle(`📊  Thông tin Giveaway`)
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            giveaway.description ? `> ${giveaway.description}` : '',
        ].filter(Boolean).join('\n'))
        .addFields(
            { name: '📋 Trạng thái', value: status, inline: true },
            { name: '🏆 Người thắng', value: `${giveaway.winner_count}`, inline: true },
            { name: '👤 Người tổ chức', value: `<@${giveaway.host_id}>`, inline: true },
            { name: '📥 Lượt tham gia', value: `${participantCount} người (${totalEntries} lượt tính cả bonus)`, inline: true },
            { name: '⏰ Kết thúc', value: isEnded ? 'Đã kết thúc' : `${formatTimestamp(giveaway.ends_at)} (${formatDuration(timeLeft)})`, inline: true },
            { name: '🔒 Vai trò yêu cầu', value: giveaway.required_role_id ? `<@&${giveaway.required_role_id}>` : 'Không có', inline: true },
        )
        .setColor(color)
        .setFooter({ text: `ID: ${giveaway.message_id}` })
        .setTimestamp();

    return embed;
}

/**
 * Build a scheduled giveaway embed (not yet started).
 */
function createScheduledEmbed(giveaway) {
    const embed = new EmbedBuilder()
        .setTitle('⏳  GIVEAWAY — SẮP BẮT ĐẦU  ⏳')
        .setDescription([
            `### 🎁 ${giveaway.prize}`,
            '',
            giveaway.description ? `${giveaway.description}\n` : '',
            `📅 Bắt đầu: ${formatTimestamp(giveaway.scheduled_start)} (${formatTimestamp(giveaway.scheduled_start, 'f')})`,
            `⏰ Kết thúc: ${formatTimestamp(giveaway.ends_at)} (${formatTimestamp(giveaway.ends_at, 'f')})`,
            `🏆 Số người thắng: **${giveaway.winner_count}**`,
            `👤 Người tổ chức: <@${giveaway.host_id}>`,
            giveaway.required_role_id ? `🔒 Vai trò yêu cầu: <@&${giveaway.required_role_id}>` : '',
            '',
            '⏳ **Giveaway này chưa bắt đầu.** Hãy theo dõi nhé!',
        ].filter(Boolean).join('\n'))
        .setColor(COLORS.SCHEDULED)
        .setFooter({ text: `ID: ${giveaway.message_id || 'đang tạo'} • Bắt đầu lúc` })
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
