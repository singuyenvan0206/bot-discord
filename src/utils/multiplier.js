const db = require('../database');
const SHOP_ITEMS = require('./shopItems');

function getUserMultiplier(userId, type) {
    const user = db.getUser(userId);
    const inv = JSON.parse(user.inventory || '{}');
    let totalMulti = 0;

    for (const [itemId, count] of Object.entries(inv)) {
        const item = SHOP_ITEMS.find(i => String(i.id) === itemId);
        if (item && item.multiplier && item.type === type) {
            // Stackable: multiplier * count
            totalMulti += item.multiplier * count;
        }
    }

    // --- Diministhing Returns (Dampening) ---
    // If multiplier > 100% (1.0), the excess is halved to prevent economy inflation.
    if (totalMulti > 1.0) {
        totalMulti = 1.0 + (totalMulti - 1.0) * 0.5;
    }

    return totalMulti;
}

module.exports = { getUserMultiplier };
