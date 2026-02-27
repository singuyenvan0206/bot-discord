const db = require('../database');
const SHOP_ITEMS = require('./shopItems');

const LEGENDARY_BUFF_IDS = [601, 602, 603, 604, 605, 606];

/**
 * Internal helper to get split multiplier data from active buffs.
 * Returns { normal: number, legendary: number }
 */
function getMultiplierData(userId, type) {
    const user = db.getUser(userId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

    const now = Math.floor(Date.now() / 1000);
    const activeBuffs = buffs.filter(b => b.expiresAt > now);

    // Background cleanup
    if (activeBuffs.length !== buffs.length) {
        db.updateUser(userId, { active_buffs: JSON.stringify(activeBuffs) });
    }

    let normal = 0;
    let legendary = 0;

    for (const buff of activeBuffs) {
        const item = SHOP_ITEMS.find(i => i.id === buff.itemId);
        if (!item || !item.multiplier) continue;

        const isMatch = item.type === type || item.type === 'daily';
        if (!isMatch) continue;

        let itemBonus = item.multiplier;
        if (item.idealJob && item.idealJob === user.job) {
            itemBonus *= 1.5;
        }

        if (LEGENDARY_BUFF_IDS.includes(buff.itemId)) {
            legendary += itemBonus;
        } else {
            normal += itemBonus;
        }
    }

    // Diminishing returns above 1.0 (100%) for normal items
    if (normal > 1.0) {
        normal = 1.0 + (normal - 1.0) * 0.5;
    }

    return { normal, legendary };
}

/**
 * Get total multiplier for specific type (capped normal + uncapped legendary)
 */
function getUserMultiplier(userId, type) {
    const data = getMultiplierData(userId, type);
    const maxCap = getDynamicCap(userId);
    return Math.min(data.normal, maxCap) + data.legendary;
}

/**
 * Total combined bonus (Level + Job + Marriage + Items)
 * Normal items, Level, Job, and Marriage are subject to maxCap.
 * Legendary fish buffs are ADDED AFTER the cap.
 */
function getTotalMultiplier(userId, type = 'income') {
    const { getLevelMultiplier } = require('./leveling');
    const user = db.getUser(userId);

    const itemData = getMultiplierData(userId, type);
    const levelMulti = getLevelMultiplier(user.level);

    let jobMulti = 0;
    if (user.job) {
        const config = require('../config');
        const jobConfig = config.ECONOMY.JOBS[user.job];
        if (jobConfig) jobMulti = jobConfig.bonus;
    }

    let marriageMulti = 0;
    if (type === 'income') {
        const marriage = db.getMarriage(userId);
        if (marriage) {
            if (marriage.ring_id === 702) marriageMulti = 0.50;
            else if (marriage.ring_id === 701) marriageMulti = 0.25;
        }
    }

    const maxCap = getDynamicCap(userId);

    // Sum all CAPPABLE multipliers
    const cappableTotal = itemData.normal + levelMulti + jobMulti + marriageMulti;
    const cappedResult = Math.min(cappableTotal, maxCap);

    // Final result = Capped bonuses + Uncapped legendary bonuses
    return cappedResult + itemData.legendary;
}

function getTotalIncomeMultiplier(userId) {
    return getTotalMultiplier(userId, 'income');
}

function getXpMultiplier(userId) {
    const user = db.getUser(userId);
    let multi = 1.0;
    if (user.job === 'teacher') multi += 0.5;
    if (user.job === 'teacher' && hasActiveItem(userId, 208)) multi += 1.0;
    if (hasActiveItem(userId, 502)) multi += 1.0;
    if (hasActiveItem(userId, 504)) multi += 1.0;
    return Math.min(multi, 5.0);
}

function isProtectedFromRob(userId) {
    return hasActiveItem(userId, 501);
}

function hasActiveItem(userId, itemId) {
    const user = db.getUser(userId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
    const now = Math.floor(Date.now() / 1000);
    return buffs.some(b => b.itemId === itemId && b.expiresAt > now);
}

function getDynamicCap(userId) {
    // Standard: 3.0 (300% bonus), VIP: 6.0 (600% bonus)
    return hasActiveItem(userId, 108) ? 6.0 : 3.0;
}

function calculateReward(base, userId, type = 'income') {
    const bonusPart = getTotalMultiplier(userId, type);
    const bonus = Math.floor(base * bonusPart);
    const total = base + bonus;
    // For logging, let's keep the dynamic cap context
    const maxCap = getDynamicCap(userId);
    const capValue = Math.round(maxCap * 100);
    return {
        total,
        bonus,
        percent: Math.round(bonusPart * 100),
        cap: capValue,
        capReached: (bonusPart - itemDataLegendaryPart(userId, type)) >= maxCap
    };
}

// Internal helper for logging/reward display if needed
function itemDataLegendaryPart(userId, type) {
    return getMultiplierData(userId, type).legendary;
}

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

function addBuff(userId, itemId, durationSeconds) {
    const user = db.getUser(userId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

    const now = Math.floor(Date.now() / 1000);
    const existingIndex = buffs.findIndex(b => b.itemId === itemId);

    if (existingIndex !== -1) {
        // Stacking: Add new duration to the existing remaining time
        const currentExpiry = buffs[existingIndex].expiresAt;
        const remaining = Math.max(0, currentExpiry - now);
        buffs[existingIndex].expiresAt = now + remaining + durationSeconds;
    } else {
        buffs.push({ itemId, expiresAt: now + durationSeconds });
    }

    db.updateUser(userId, { active_buffs: JSON.stringify(buffs) });
}

module.exports = {
    addBuff,
    getUserMultiplier,
    getTotalMultiplier,
    getTotalIncomeMultiplier,
    getXpMultiplier,
    isProtectedFromRob,
    hasActiveItem,
    calculateReward,
    removeActiveBuff
};
