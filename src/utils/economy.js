/**
 * Parses a string amount into a number, supporting abbreviations (k, m, b) and shorthand like "all".
 * @param {string|number} input The input string or number to parse.
 * @param {number} balance The user's current balance (required for "all").
 * @returns {number} The parsed integer amount.
 */
function parseAmount(input, balance = 0) {
    if (typeof input === 'number') return Math.floor(input);
    if (!input || typeof input !== 'string') return 0;

    const str = input.toLowerCase().trim();
    if (str === 'all' || str === 'max' || str === 'a') return balance;

    const units = {
        'k': 1000,
        'm': 1000000,
        'b': 1000000000
    };

    const match = str.match(/^([\d.]+)([kmb])?$/);
    if (!match) return parseInt(str) || 0;

    const value = parseFloat(match[1]);
    const unit = match[2];

    if (unit && units[unit]) {
        return Math.floor(value * units[unit]);
    }

    return Math.floor(value);
}

module.exports = { parseAmount };
