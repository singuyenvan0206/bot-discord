const db = require('../database');
const SHOP_ITEMS = require('./shopItems');
const housingConfig = require('../config/housing');

const LEGENDARY_BUFF_IDS = [601, 602, 603, 604, 605, 606, 607, 608];

const getJobMilestoneBonus = (user, type, options = {}) => {
    const points = Number(user.milestone_count || 0);
    if (points <= 0) return 0;

    const job = user.job || 'default';
    const category = options.category || 'general';

    if (type === 'xp') {
        if (job === 'teacher') return (points * 0.1); // +10% per point
        return 0;
    }

    if (type === 'income') {
        if (job === 'police' && (category === 'work' || category === 'search')) return points * 0.1;
        if (job === 'criminal' && (category === 'crime' || category === 'rob')) return points * 0.1;
        if (job === 'hacker' && category === 'minigame') return points * 0.25; // Buffed from 0.1
        if (job === 'trader' && category === 'business') return points * 0.20; // Buffed from 0.1
    }

    if (type === 'gamble') {
        if (job === 'hacker' && category === 'minigame') return points * 0.1;
    }

    return 0;
};


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
        if (!item || !item.multiplier) {
            // Special Virtual Buffs (no item entry or multiplier in item)
            if (buff.itemId === 612 && type === 'xp') {
                normal += 1.0; // Mentor Buff: +100% XP
            }
            continue;
        }

        // 1. Correct Type Match
        // Buffs match if:
        // - Item type exactly matches requested type (income/xp/gamble)
        // - Item type is 'daily' (buffs everything)
        // - OR it's a legendary fish buff (id 601-608) AND type is 'income'
        const isLegendaryIncome = LEGENDARY_BUFF_IDS.includes(buff.itemId) && type === 'income';
        const isTypeMatch = item.type === type || item.type === 'daily';

        if (!isTypeMatch && !isLegendaryIncome) continue;

        let itemBonus = item.multiplier;

        if (isLegendaryIncome) {
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
async function getTotalMultiplier(memberOrId, type = 'income', guildId = null, options = {}) {
    const data = await getMultiplierBreakdown(memberOrId, type, guildId, options);
    return data.total;
}

/**
 * Detailed multiplier data for UI
 */
async function getMultiplierBreakdown(memberOrId, type = 'income', guildId = null, options = {}) {
    const { getLevelMultiplier } = require('./leveling');
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const actualGuildId = guildId || (memberOrId.guild ? memberOrId.guild.id : null);
    const user = await db.getUser(userId, actualGuildId);

    const itemData = await getMultiplierData(memberOrId, actualGuildId, type);
    const levelMulti = getLevelMultiplier(user.level);
    const houseMulti = calculateHouseMulti(user, type);

    let jobMulti = 0;
    if (user.job) {
        const config = require('../config');
        const jobConfig = config.ECONOMY.JOBS[user.job];
        if (jobConfig) jobMulti = jobConfig.bonus;
    }

    let marriageMulti = 0;
    const marriage = await db.getMarriage(actualGuildId, userId);
    if (marriage) {
        if (marriage.ring_id === 702) marriageMulti = 0.25; // Halved from 0.50
        else if (marriage.ring_id === 701) marriageMulti = 0.125; // Halved from 0.25
    }
    let roleIncomeMulti = 0;
    // Role Buffs (Dynamic from Database)
    if (memberOrId && typeof memberOrId === 'object' && memberOrId.roles) {
        const guildRoles = await db.getGuildRoles(actualGuildId);
        for (const role of guildRoles) {
            if (memberOrId.roles.cache.has(role.role_id)) {
                roleIncomeMulti += (type === 'income' ? (role.income_buff || 0) : (role.gamble_buff || 0));
            }
        }
    }

    // Milestone Perks (Job Specific)
    let milestoneMulti = getJobMilestoneBonus(user, type, options);


    const maxCap = await getDynamicCap(memberOrId, actualGuildId);

    // Sum base multipliers (Items Normal, Level, Job, House, Role Nerfed, Milestone)
    const baseRaw = itemData.normal + levelMulti + jobMulti + houseMulti + (roleIncomeMulti * 0.5) + milestoneMulti;
    const cappedBase = Math.min(baseRaw, maxCap);

    // Final result: Capped Base + Legendary (uncapped) + Event (uncapped)
    const event = await require('./eventSystem').getCurrentEvent(actualGuildId);
    let eventBonus = 0;
    if (event.incomeBuff) eventBonus += event.incomeBuff;
    if (event.jobMatch === user.job) {
        if (options.category === 'work' && event.salaryBuff) eventBonus += event.salaryBuff;
        if ((options.category === 'crime' || options.category === 'rob') && event.crimeBonus) eventBonus += event.crimeBonus;
        if (options.category === 'minigame' && event.minigameBonus) eventBonus += event.minigameBonus;
        if (options.category === 'business' && event.businessBonus) eventBonus += event.businessBonus;
    }
    // Specific case for fishing which is handled both by incomeBuff and specialized fishIncome
    if (options.category === 'fish' && event.fishIncome) eventBonus += event.fishIncome;

    const total = cappedBase + itemData.legendary + eventBonus + marriageMulti;

    return {
        total,
        base: baseRaw,
        capped: cappedBase,
        legendary: itemData.legendary,
        event: eventBonus,
        eventName: event.id !== 'none' ? event.id : null,
        cap: maxCap,
        level: levelMulti,
        job: jobMulti,
        house: houseMulti,
        marriage: marriageMulti,
        role: roleIncomeMulti * 0.5,
        milestone: milestoneMulti,
        itemsNormal: itemData.normal
    };
}

async function getTotalIncomeMultiplier(memberOrId) {
    return await getTotalMultiplier(memberOrId, 'income');
}

async function getXpMultiplier(memberOrId, guildId = null) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const actualGuildId = guildId || (memberOrId.guild ? memberOrId.guild.id : null);

    // Use unified multiplier logic for XP
    const data = await getMultiplierData(memberOrId, actualGuildId, 'xp');
    let multi = 1.0 + data.normal + data.legendary;

    const user = await db.getUser(userId, actualGuildId);

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

    multi += getJobMilestoneBonus(user, 'xp');

    // Role XP Boost
    if (memberOrId && typeof memberOrId === 'object' && memberOrId.roles) {
        const guildRoles = await db.getGuildRoles(actualGuildId);
        for (const roleConfig of guildRoles) {
            if (memberOrId.roles.cache.has(roleConfig.role_id) && roleConfig.xp_buff) {
                multi += roleConfig.xp_buff;
            }
        }
    }

    return Math.min(multi, 15.0); // Capped at 15.0 (15x XP)
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
    const user = await db.getUser(userId, gId);

    // Standard: 0.5 (150% total income), VIP: 1.0 (200% total income)
    let cap = await hasActiveItem(gId, userId, 104) ? 1.0 : 0.5;

    // Add housing cap bonus
    cap += calculateHouseMulti(user, 'cap');

    return cap;
}

async function calculateReward(base, memberOrId, type = 'income', options = {}) {
    // PvP mode: no bonus applied — keeps user-vs-user transactions zero-sum
    if (options.pvpMode) {
        return { total: base, bonus: 0, percent: 0, cap: 100, capReached: false };
    }
    const guildId = (memberOrId && memberOrId.guild) ? memberOrId.guild.id : null;
    const breakdown = await getMultiplierBreakdown(memberOrId, type, guildId, options);
    const bonusPart = breakdown.total;
    const bonus = Math.floor(base * bonusPart);
    const total = base + bonus;

    const maxCap = await getDynamicCap(memberOrId, guildId);
    return {
        total,
        bonus,
        percent: Math.round(bonusPart * 100),
        cap: Math.round(maxCap * 100),
        capReached: (bonusPart - breakdown.legendary) >= (maxCap - 0.001) // Small epsilon
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
    getDynamicCap,
    getMultiplierBreakdown,
    getJobMilestoneBonus
};

