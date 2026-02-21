/**
 * Formats a duration in seconds into a human-readable string (e.g., 1h, 5m, 10s)
 * @param {number} seconds - The duration in seconds
 * @param {string} lang - The language code ('en' or 'vi')
 * @returns {string} - The formatted duration string
 */
function formatDuration(seconds, lang = 'vi') {
    if (seconds === 0) return '0s';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);

    return parts.join(' ');
}

module.exports = { formatDuration };
