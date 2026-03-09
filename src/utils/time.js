const { t } = require('./i18n');

/**
 * Formats a duration in seconds into a human-readable string (e.g., 1 hour 5 minutes)
 * @param {number} seconds - The duration in seconds
 * @param {string} lang - The language code ('en' or 'vi')
 * @returns {string} - The formatted duration string
 */
function formatDuration(seconds, lang = 'vi') {
    if (seconds <= 0) return `0 ${t('time.seconds', lang)}`;

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];

    if (days > 0) {
        const unit = days === 1 ? t('time.day', lang) : t('time.days', lang);
        parts.push(`${days} ${unit}`);
    }
    if (hours > 0) {
        const unit = hours === 1 ? t('time.hour', lang) : t('time.hours', lang);
        parts.push(`${hours} ${unit}`);
    }
    if (minutes > 0) {
        const unit = minutes === 1 ? t('time.minute', lang) : t('time.minutes', lang);
        parts.push(`${minutes} ${unit}`);
    }
    if (secs > 0 || parts.length === 0) {
        const unit = secs === 1 ? t('time.second', lang) : t('time.seconds', lang);
        parts.push(`${secs} ${unit}`);
    }

    return parts.join(' ');
}

/**
 * Parses a duration string (e.g., 1h, 30m, 1d) into seconds.
 * @param {string} input - The input string.
 * @returns {number|null} - The duration in seconds, or null if invalid.
 */
function parseDuration(input) {
    if (!input || typeof input !== 'string') return null;

    const regex = /^(\d+)([smhd])$/i;
    const match = input.toLowerCase().trim().match(regex);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        's': 1,
        'm': 60,
        'h': 3600,
        'd': 86400
    };

    return value * multipliers[unit];
}

module.exports = { formatDuration, parseDuration };
