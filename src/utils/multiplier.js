const db = require('../database');
const SHOP_ITEMS = require('./shopItems');
const housingConfig = require('../config/housing');

const LEGENDARY_BUFF_IDS = [601, 602, 603, 604, 605, 606];

/**
 * Internal helper to get split multiplier data from active buffs.
 * Returns { normal: number, legendary: number }
 */
async function getMultiplierData(memberOrId, guildId, type) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const gId = guildId || (memberOrId.guild ? memberOrId.guild.id : null);

    const user = await db.getUser(userId, gId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

    const now = Math.floor(Date.now() / 1000);
    const activeBuffs = buffs.filter(b => b.expiresAt > now);

    // Background cleanup
    if (activeBuffs.length !== buffs.length) {
        await db.updateUser(gId, userId, { active_buffs: JSON.stringify(activeBuffs) });
    }

    return calculateMultiplierFromBuffs(activeBuffs, user.job, type, userId, gId);
}

function calculateHouseMulti(user, type) {
    if (!user.house_id) return 0;
    const tier = housingConfig.TIERS[user.house_id];
    let multi = (type === 'income') ? (tier?.income_buff || 0) : 0;

    // Add interiors
    const houseData = JSON.parse(user.house_data || '{}');
    Object.keys(houseData).forEach(id => {
        const deco = housingConfig.INTERIORS[id];
        if (deco && deco.buff === type) {
            multi += deco.value;
        }
    });

    return multi;
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
async function getUserMultiplier(memberOrId, type) {
    const guildId = memberOrId.guild ? memberOrId.guild.id : null;
    const data = await getMultiplierData(memberOrId, guildId, type);
    const maxCap = await getDynamicCap(memberOrId, guildId);
    return Math.min(data.normal, maxCap) + data.legendary;
}

/**
 * Total combined bonus (Level + Job + Marriage + Items)
 * Normal items, Level, Job, and Marriage are subject to maxCap.
 * Legendary fish buffs are ADDED AFTER the cap.
 */
async function getTotalMultiplier(memberOrId, type = 'income') {
    const { getLevelMultiplier } = require('./leveling');
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const guildId = memberOrId.guild ? memberOrId.guild.id : null;
    const user = await db.getUser(userId, guildId);

    const itemData = await getMultiplierData(memberOrId, guildId, type);
    const levelMulti = getLevelMultiplier(user.level);
    const houseMulti = calculateHouseMulti(user, type);

    let jobMulti = 0;
    if (user.job) {
        const config = require('../config');
        const jobConfig = config.ECONOMY.JOBS[user.job];
        if (jobConfig) jobMulti = jobConfig.bonus;
    }

    let marriageMulti = 0;
    const marriage = await db.getMarriage(guildId, userId);
    if (marriage) {
        if (marriage.ring_id === 702) marriageMulti = 0.50;
        else if (marriage.ring_id === 701) marriageMulti = 0.25;
    }

    let roleIncomeMulti = 0;
    let roleXpMulti = 0;
    const config = require('../config');

    // 1. Role Buffs (Dynamic from Database or Static Config)
    if (memberOrId && typeof memberOrId === 'object' && memberOrId.roles) {
        const gId = memberOrId.guild.id;
        const guildRoles = await db.getGuildRoles(gId);

        for (const role of guildRoles) {
            const rId = role.role_id;
            if (memberOrId.roles.cache.has(rId)) {
                roleIncomeMulti += (role.income_buff || 0);
                roleXpMulti += (role.xp_buff || 0);
            }
        }
    } else {
        // Fallback for background tasks (using purchased_roles in DB)
        // Since we don't know the guild context easily here, and config is removed,
        // we might need to skip this or fetch from all guilds.
        // However, role buffs are usually guild-specific.
    }

    const maxCap = await getDynamicCap(memberOrId);

    // Sum ALL multipliers (Items, Level, Job, House, Roles, Marriage, Legendary)
    const grandTotal = itemData.normal + itemData.legendary + levelMulti + jobMulti + houseMulti + roleIncomeMulti + marriageMulti;

    // Final result: Everything is capped at maxCap (1.5x/2.0x total)
    // NERF: Apply 0.5x multiplier to role buffs automatically
    return Math.min(grandTotal - roleIncomeMulti + (roleIncomeMulti * 0.5), maxCap);
}

async function getTotalIncomeMultiplier(memberOrId) {
    return await getTotalMultiplier(memberOrId, 'income');
}

async function getXpMultiplier(memberOrId) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const guildId = memberOrId.guild ? memberOrId.guild.id : null;
    const user = await db.getUser(userId, guildId);
    let multi = 1.0;

    // Housing XP Buff
    if (user.house_id) {
        const tier = housingConfig.TIERS[user.house_id];
        if (tier) multi += tier.xp_buff;

        const houseData = JSON.parse(user.house_data || '{}');
        Object.keys(houseData).forEach(id => {
            const deco = housingConfig.INTERIORS[id];
            if (deco && deco.buff === 'xp') {
                multi += deco.value;
            }
        });
    }

    if (user.job === 'teacher') multi += 1.0; // Teacher XP Base: +100%
    if (await hasActiveItem(guildId, userId, 502)) multi += 1.0; // XP Boost Potion: +100%

    // Role XP Boost
    const config = require('../config');
    const guildRoles = await db.getGuildRoles(guildId);
    if (typeof memberOrId !== 'string' && memberOrId?.roles) {
        guildRoles.forEach(roleConfig => {
            if (memberOrId.roles.cache.has(roleConfig.role_id) && roleConfig.xp_buff) {
                multi += roleConfig.xp_buff;
            }
        });
    }

    return Math.min(multi, 15.0); // Increased cap to 15.0 to allow stacks
}

async function isProtectedFromRob(guildId, userId) {
    return await hasActiveItem(guildId, userId, 501);
}

async function hasActiveItem(guildId, userId, itemId) {
    const user = await db.getUser(userId, guildId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
    const now = Math.floor(Date.now() / 1000);
    return buffs.some(b => b.itemId === itemId && b.expiresAt > now);
}

async function getDynamicCap(memberOrId, guildId) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const gId = guildId || (memberOrId.guild ? memberOrId.guild.id : null);

    // Standard: 0.5 (150% total income), VIP: 1.0 (200% total income)
    let cap = await hasActiveItem(gId, userId, 104) ? 1.0 : 0.5;
    return cap;
}

async function calculateReward(base, memberOrId, type = 'income', options = {}) {
    // PvP mode: no bonus applied — keeps user-vs-user transactions zero-sum
    if (options.pvpMode) {
        return { total: base, bonus: 0, percent: 0, cap: 0, capReached: false };
    }
    const guildId = memberOrId.guild ? memberOrId.guild.id : null;
    const bonusPart = await getTotalMultiplier(memberOrId, type);
    const bonus = Math.floor(base * bonusPart);
    const total = base + bonus;
    // For logging, let's keep the dynamic cap context
    const maxCap = await getDynamicCap(memberOrId, guildId);
    const capValue = Math.round(maxCap * 100);
    const itemData = await getMultiplierData(memberOrId, guildId, type);
    return {
        total,
        bonus,
        percent: Math.round(bonusPart * 100),
        cap: capValue,
        capReached: (bonusPart - itemData.legendary) >= maxCap
    };
}

async function removeActiveBuff(guildId, userId, itemId) {
    const user = await db.getUser(userId, guildId);
    let buffs = [];
    try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
    const filteredBuffs = buffs.filter(b => b.itemId !== itemId);
    if (filteredBuffs.length !== buffs.length) {
        await db.updateUser(guildId, userId, { active_buffs: JSON.stringify(filteredBuffs) });
        return true;
    }
    return false;
}

async function addBuff(guildId, userId, itemId, durationSeconds) {
    const user = await db.getUser(userId, guildId);
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

    await db.updateUser(guildId, userId, { active_buffs: JSON.stringify(buffs) });
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

