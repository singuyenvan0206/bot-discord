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
    return totalMulti;
}

module.exports = { getUserMultiplier };
