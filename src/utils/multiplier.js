const db = require('../database');
const SHOP_ITEMS = require('./shopItems');

function getUserMultiplier(userId, type) {
    const user = db.getUser(userId);
    let buffs = [];
    try {
        buffs = JSON.parse(user.active_buffs || '[]');
    } catch (e) {
        buffs = [];
    }

    const now = Math.floor(Date.now() / 1000);
    const activeBuffs = buffs.filter(b => b.expiresAt > now);

    // Background cleanup if expired buffs were removed
    if (activeBuffs.length !== buffs.length) {
        db.updateUser(userId, { active_buffs: JSON.stringify(activeBuffs) });
    }

    let totalMulti = 0;
    for (const buff of activeBuffs) {
        const item = SHOP_ITEMS.find(i => i.id === buff.itemId);
        if (item && item.multiplier && item.type === type) {
            if (item.idealJob && item.idealJob === user.job) {
                totalMulti += item.multiplier * 2;
            } else {
                totalMulti += item.multiplier;
            }
        }
    }

    // --- Diminishing Returns (Dampening) ---
    if (totalMulti > 1.0) {
        totalMulti = 1.0 + (totalMulti - 1.0) * 0.5;
    }

    return totalMulti;
}

module.exports = { getUserMultiplier };
