const SHOP_ITEMS = require('./shopItems');

/**
 * Parses a string amount into a number, supporting abbreviations (k, m, b) and shorthand like "all".
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

/**
 * Calculates a user's total net worth (Wallet + Inventory Value).
 * @param {object} userData User data from the database.
 * @returns {number} The total net worth.
 */
function calculateNetWorth(userData) {
    if (!userData) return 0;

    let total = userData.balance || 0;
    const inventory = JSON.parse(userData.inventory || '{}');

    for (const [id, count] of Object.entries(inventory)) {
        const item = SHOP_ITEMS.find(i => String(i.id) === id);
        if (item) {
            total += (item.price * count);
        }
    }

    return total;
}

module.exports = { parseAmount, calculateNetWorth };
