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

        let itemBonus = item.multiplier;
        if (item.idealJob && item.idealJob === user.job) {
            itemBonus *= 1.5; // Ideal job = 1.5x efficiency for that item
        }
        totalMulti += itemBonus;
    }

    const maxCap = getDynamicCap(userId);

    // Diminishing returns above 1.0 (100%), hard cap at dynamic maxCap
    if (totalMulti > 1.0) {
        totalMulti = 1.0 + (totalMulti - 1.0) * 0.5;
    }

    return Math.min(totalMulti, maxCap);
}

/**
 * @returns {number} Bonus multiplier (e.g. 0.25 for +25%).
 * Sums: getUserMultiplier(type) + getLevelMultiplier + JobBonus
 * Caps at 2.5 (250%).
 */
function getTotalMultiplier(userId, type = 'income') {
    const { getLevelMultiplier } = require('./leveling');
    const user = db.getUser(userId);

    // 1. Item Multipliers (Income, Daily, or Gamble)
    const itemMulti = getUserMultiplier(userId, type);

    // 2. Level Multiplier
    const levelMulti = getLevelMultiplier(user.level);

    // 3. Job Multiplier
    let jobMulti = 0;
    if (user.job) {
        const config = require('../config');
        const jobConfig = config.ECONOMY.JOBS[user.job];
        if (jobConfig) jobMulti = jobConfig.bonus;
    }

    const totalBonusMulti = itemMulti + levelMulti + jobMulti;
    const maxCap = getDynamicCap(userId);

    // Hard cap at dynamic maxCap
    return Math.min(totalBonusMulti, maxCap);
}

/**
 * Legacy wrapper for backward compatibility
 */
function getTotalIncomeMultiplier(userId) {
    return getTotalMultiplier(userId, 'income');
}

/**
 * Get XP multiplier. Teacher job + Whiteboard (218) = ×2, teacher alone = ×1.5,
 * XP Boost Potion (502) active = adds ×0.5 for anyone.
 * Caps at 3.5 total (250% bonus).
 */
function getXpMultiplier(userId) {
    const user = db.getUser(userId);
    let multi = 1.0;

    if (user.job === 'teacher') multi += 0.5; // Teacher: +50% XP

    // Whiteboard bonus for teacher
    if (user.job === 'teacher' && hasActiveItem(userId, 208)) multi += 1.0; // +100% total teacher bonus with item

    // XP Boost Potion (502) & Heart Chocolates (Already in shop but logic here)
    if (hasActiveItem(userId, 502)) multi += 1.0;
    if (hasActiveItem(userId, 504)) multi += 1.0;

    // Mega Buffs from Legendary Fish - hidden IDs 601, 602 (Income type, but let's add a small XP nudge if we want)
    // For now stick to planned 5.0 cap
    return Math.min(multi, 5.0);
}

/**
 * Check if a user has Shield of Protection (501) active — blocks one rob.
 */
function isProtectedFromRob(userId) {
    return hasActiveItem(userId, 501);
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

/**
 * Get dynamic cap based on VIP status (Item 108).
 * Standard: 2.5 (250%), VIP: 5.0 (500%)
 */
function getDynamicCap(userId) {
    // Mythical Fish Buffs (Megalodon 601, Poseidon 602, Pearl 603, Kraken 604) grant 700% cap
    if (hasActiveItem(userId, 601) || hasActiveItem(userId, 602) ||
        hasActiveItem(userId, 603) || hasActiveItem(userId, 604)) {
        return 7.0;
    }
    return hasActiveItem(userId, 108) ? 6.0 : 3.0;
}

/**
 * Helper to calculate final reward with capped bonus.
 * type = 'income' | 'gamble'
 * Returns { total, bonus, percent }
 */
function calculateReward(base, userId, type = 'income') {
    let bonusPart = getTotalMultiplier(userId, type);
    const maxCap = getDynamicCap(userId);

    // Safety fail-safe clamp: never exceed dynamic maxCap
    if (bonusPart > maxCap) {
        console.warn(`[Multiplier] Safety clamp triggered for ${userId}: ${bonusPart} -> ${maxCap}`);
        bonusPart = maxCap;
    }

    const bonus = Math.floor(base * bonusPart);
    const total = base + bonus;
    return { total, bonus, percent: Math.round(bonusPart * 100), cap: Math.round(maxCap * 100) };
}

/**
 * Xóa một buff đang hoạt động (khi bị hỏng hoặc bị tịch thu).
 */
function removeActiveBuff(userId, itemId) {
    const user = db.getUser(userId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

    const filteredBuffs = buffs.filter(b => b.itemId !== itemId);

    if (filteredBuffs.length !== buffs.length) {
        db.updateUser(userId, { active_buffs: JSON.stringify(filteredBuffs) });
        return true;
    }
    return false;
}

module.exports = { getUserMultiplier, getTotalMultiplier, getTotalIncomeMultiplier, getXpMultiplier, isProtectedFromRob, hasActiveItem, calculateReward, removeActiveBuff };
