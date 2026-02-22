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

module.exports = { formatDuration };
