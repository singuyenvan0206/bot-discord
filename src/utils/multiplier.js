const db = require('../database');
const SHOP_ITEMS = require('./shopItems');

/**
 * Get total income/daily/gamble multiplier from active buffs.
 * type = 'income' | 'daily' | 'gamble'
 */
function getUserMultiplier(userId, type) {
    const user = db.getUser(userId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

    const now = Math.floor(Date.now() / 1000);
    const activeBuffs = buffs.filter(b => b.expiresAt > now);

    // Background cleanup
    if (activeBuffs.length !== buffs.length) {
        db.updateUser(userId, { active_buffs: JSON.stringify(activeBuffs) });
    }

    let totalMulti = 0;
    for (const buff of activeBuffs) {
        const item = SHOP_ITEMS.find(i => i.id === buff.itemId);
        if (!item || !item.multiplier) continue;

        // 'daily' items apply to both daily and income commands
        const isMatch = item.type === type || item.type === 'daily';
        if (!isMatch) continue;

        if (item.idealJob && item.idealJob === user.job) {
            totalMulti += item.multiplier * 2; // Ideal job = double bonus
        } else {
            totalMulti += item.multiplier;
        }
    }

    // Diminishing returns above 1.0
    if (totalMulti > 1.0) {
        totalMulti = 1.0 + (totalMulti - 1.0) * 0.5;
    }

    // Hard cap at 200% (2.0)
    return Math.min(totalMulti, 2.0);
}

/**
 * Get XP multiplier. Teacher job + Whiteboard (218) = ×2, teacher alone = ×1.5,
 * XP Boost Potion (502) active = adds ×0.5 for anyone.
 */
function getXpMultiplier(userId) {
    const user = db.getUser(userId);
    let multi = 1.0;

    if (user.job === 'teacher') multi += 0.5; // Teacher: +50% XP

    // Whiteboard bonus for teacher
    if (user.job === 'teacher' && hasActiveItem(userId, 208)) multi += 0.5; // +50% more

    // XP Boost Potion (501)
    if (hasActiveItem(userId, 501)) multi += 0.5;

    return multi;
}

/**
 * Check if a user has Shield of Protection (502) active — blocks one rob.
 */
function isProtectedFromRob(userId) {
    return hasActiveItem(userId, 502);
}

/**
 * Check if a specific item is active for a user.
 */
function hasActiveItem(userId, itemId) {
    const user = db.getUser(userId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
    const now = Math.floor(Date.now() / 1000);
    return buffs.some(b => b.itemId === itemId && b.expiresAt > now);
}

module.exports = { getUserMultiplier, getXpMultiplier, isProtectedFromRob, hasActiveItem };
