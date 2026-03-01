const db = require('../database');
const SHOP_ITEMS = require('./shopItems');

const LEGENDARY_BUFF_IDS = [601, 602, 603, 604, 605, 606];

/**
 * Internal helper to get split multiplier data from active buffs.
 * Returns { normal: number, legendary: number }
 */
function getMultiplierData(memberOrId, guildId, type) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const gId = guildId || (memberOrId.guild ? memberOrId.guild.id : null);

    const user = db.getUser(userId, gId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

    const now = Math.floor(Date.now() / 1000);
    const activeBuffs = buffs.filter(b => b.expiresAt > now);

    // Background cleanup
    if (activeBuffs.length !== buffs.length) {
        db.updateUser(gId, userId, { active_buffs: JSON.stringify(activeBuffs) });
    }

    return calculateMultiplierFromBuffs(activeBuffs, user.job, type, userId, gId);
}

function calculateMultiplierFromBuffs(activeBuffs, userJob, type, userId, gId) {
    let normal = 0;
    let legendary = 0;

    for (const buff of activeBuffs) {
        const item = SHOP_ITEMS.find(i => i.id === buff.itemId);
        if (!item || !item.multiplier) continue;

        const isMatch = item.type === type || item.type === 'daily' || LEGENDARY_BUFF_IDS.includes(buff.itemId);
        if (!isMatch) continue;

        let itemBonus = item.multiplier;
        if (item.idealJob && item.idealJob === userJob) {
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
function getUserMultiplier(memberOrId, type) {
    const guildId = memberOrId.guild ? memberOrId.guild.id : null;
    const data = getMultiplierData(memberOrId, guildId, type);
    const maxCap = getDynamicCap(memberOrId, guildId);
    return Math.min(data.normal, maxCap) + data.legendary;
}

/**
 * Total combined bonus (Level + Job + Marriage + Items)
 * Normal items, Level, Job, and Marriage are subject to maxCap.
 * Legendary fish buffs are ADDED AFTER the cap.
 */
function getTotalMultiplier(memberOrId, type = 'income') {
    const { getLevelMultiplier } = require('./leveling');
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const guildId = memberOrId.guild ? memberOrId.guild.id : null;
    const user = db.getUser(userId, guildId); // Use db.getUser directly

    const itemData = getMultiplierData(memberOrId, guildId, type);
    const levelMulti = getLevelMultiplier(user.level);

    let jobMulti = 0;
    if (user.job) {
        const config = require('../config');
        const jobConfig = config.ECONOMY.JOBS[user.job];
        if (jobConfig) jobMulti = jobConfig.bonus;
    }

    let marriageMulti = 0;
    const marriage = db.getMarriage(guildId, userId);
    if (marriage) {
        if (marriage.ring_id === 702) marriageMulti = 0.50;
        else if (marriage.ring_id === 701) marriageMulti = 0.25;
    }

    let roleIncomeMulti = 0;
    let roleXpMulti = 0; // Initialize roleXpMulti as it's used in the new block
    const config = require('../config');

    // 1. Role Buffs (Dynamic from Database or Static Config)
    if (memberOrId && typeof memberOrId === 'object' && memberOrId.roles) {
        const guildId = memberOrId.guild.id;
        const guildRoles = db.getGuildRoles(guildId);

        // If guild has custom roles, use them. Otherwise fallback to config.
        const shopRoles = guildRoles.length > 0 ? guildRoles : config.ECONOMY.ROLE_SHOP;

        for (const role of shopRoles) {
            const rId = role.id || role.role_id;
            if (memberOrId.roles.cache.has(rId)) {
                roleIncomeMulti += (role.income_buff || role.income_buff_pct || 0);
                roleXpMulti += (role.xp_buff || role.xp_buff_pct || 0);
            }
        }
    } else {
        // Fallback for background tasks (using purchased_roles in DB)
        const purchasedRoles = JSON.parse(user.purchased_roles || '[]');
        // Since we don't have guildId here easily, we can only fallback to global config 
        // or skip if we want strict server-localization. 
        // For now, let's keep it minimal for background tasks.
        for (const roleId of purchasedRoles) {
            const role = config.ECONOMY.ROLE_SHOP.find(r => r.id === roleId);
            if (role) {
                roleIncomeMulti += (role.income_buff || 0);
                roleXpMulti += (role.xp_buff || 0);
            }
        }
    }

    const maxCap = getDynamicCap(memberOrId);

    // Sum all CAPPABLE multipliers (Items, Level, Job)
    const cappableTotal = itemData.normal + levelMulti + jobMulti;
    const cappedResult = Math.min(cappableTotal, maxCap);

    // Final result = Capped bonuses + Uncapped legendary bonuses + Uncapped role bonuses + Uncapped Marriage
    return cappedResult + itemData.legendary + roleIncomeMulti + marriageMulti;
}

function getTotalIncomeMultiplier(memberOrId) {
    return getTotalMultiplier(memberOrId, 'income');
}

function getXpMultiplier(memberOrId) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const guildId = memberOrId.guild ? memberOrId.guild.id : null;
    const user = db.getUser(userId, guildId);
    let multi = 1.0;
    if (user.job === 'teacher') multi += 0.5;
    if (user.job === 'teacher' && hasActiveItem(guildId, userId, 208)) multi += 1.0;
    if (hasActiveItem(guildId, userId, 502)) multi += 1.0; // XP Boost Potion

    // Role XP Boost
    const config = require('../config');
    if (typeof memberOrId !== 'string' && memberOrId?.roles) {
        config.ECONOMY.ROLE_SHOP.forEach(roleConfig => {
            if (memberOrId.roles.cache.has(roleConfig.id) && roleConfig.xp_buff) {
                multi += roleConfig.xp_buff;
            }
        });
    } else {
        const purchasedRoles = JSON.parse(user.purchased_roles || '[]');
        purchasedRoles.forEach(roleId => {
            const roleConfig = config.ECONOMY.ROLE_SHOP.find(r => r.id === roleId);
            if (roleConfig && roleConfig.xp_buff) {
                multi += roleConfig.xp_buff;
            }
        });
    }

    return Math.min(multi, 10.0); // Increased cap because of role stacks
}

function isProtectedFromRob(guildId, userId) {
    return hasActiveItem(guildId, userId, 501);
}

function hasActiveItem(guildId, userId, itemId) {
    const user = db.getUser(userId, guildId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
    const now = Math.floor(Date.now() / 1000);
    return buffs.some(b => b.itemId === itemId && b.expiresAt > now);
}

function getDynamicCap(memberOrId, guildId) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const gId = guildId || (memberOrId.guild ? memberOrId.guild.id : null);
    // Standard: 3.0 (300% bonus), VIP: 6.0 (600% bonus)
    return hasActiveItem(gId, userId, 108) ? 6.0 : 3.0;
}

function calculateReward(base, memberOrId, type = 'income') {
    const guildId = memberOrId.guild ? memberOrId.guild.id : null;
    const bonusPart = getTotalMultiplier(memberOrId, type);
    const bonus = Math.floor(base * bonusPart);
    const total = base + bonus;
    // For logging, let's keep the dynamic cap context
    const maxCap = getDynamicCap(memberOrId, guildId);
    const capValue = Math.round(maxCap * 100);
    return {
        total,
        bonus,
        percent: Math.round(bonusPart * 100),
        cap: capValue,
        capReached: (bonusPart - itemDataLegendaryPart(memberOrId, guildId, type)) >= maxCap
    };
}

// Internal helper for logging/reward display if needed
function itemDataLegendaryPart(memberOrId, guildId, type) {
    return getMultiplierData(memberOrId, guildId, type).legendary;
}

function removeActiveBuff(guildId, userId, itemId) {
    const user = db.getUser(userId, guildId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
    const filteredBuffs = buffs.filter(b => b.itemId !== itemId);
    if (filteredBuffs.length !== buffs.length) {
        db.updateUser(guildId, userId, { active_buffs: JSON.stringify(filteredBuffs) });
        return true;
    }
    return false;
}

function addBuff(guildId, userId, itemId, durationSeconds) {
    const user = db.getUser(userId, guildId);
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

    db.updateUser(guildId, userId, { active_buffs: JSON.stringify(buffs) });
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
    removeActiveBuff,
    getDynamicCap
};
