const db = require('../database');

/**
 * XP Constants
 */
const XP_AMOUNTS = {
    MESSAGE: { min: 5, max: 15 },
    COMMAND_SUCCESS: { min: 25, max: 50 },
    COMMAND_FAILURE: { min: 5, max: 10 },
    GAME_WIN: { min: 50, max: 100 },
    GAME_ACTION: { min: 5, max: 15 }
};

/**
 * Tính toán cấp độ hiện tại dựa trên số XP.
 * Công thức: Level = 0.1 * sqrt(XP)  =>  XP = (Level / 0.1)^2
 */
function calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp));
}

const xpCooldowns = new Map();

/**
 * Thêm XP cho người dùng. 
 * Hàm này sẽ tự động cập nhật cả XP và Level trong database nhưng KHÔNG in ra thông báo thăng cấp.
 * 
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số XP muốn cộng
 * @param {boolean} bypassCooldown - Bỏ qua thời gian chờ (dùng cho phần thưởng nhiệm vụ, v.v.)
 * @returns {object} - Object chứa thông tin cấp độ hiện tại và việc có thăng cấp hay không { level, leveledUp }
 */
async function addXp(memberOrId, amount, guildId = null, bypassCooldown = false) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const gId = guildId || (memberOrId.guild ? memberOrId.guild.id : null);
    const config = require('../config');

    // ─── Anti-Spam Check ───
    if (!bypassCooldown) {
        const now = Date.now();
        const lastXpGain = xpCooldowns.get(userId) || 0;
        const xpCooldownTime = (config.ECONOMY?.LEVELING?.XP_COOLDOWN || 60) * 1000;

        if (now - lastXpGain < xpCooldownTime) {
            return { level: 0, leveledUp: false, cooldown: true };
        }
        xpCooldowns.set(userId, now);
    }

    const user = await db.getUser(userId, gId);

    // Apply global and user-specific XP multipliers
    const { getXpMultiplier } = require('./multiplier');
    const xpBoost = await getXpMultiplier(memberOrId);
    const guildXpMulti = gId ? await db.getGuildSetting(gId, 'xp_multiplier', 1.0) : 1.0;

    const finalAmount = Math.floor(amount * xpBoost * (config.ECONOMY?.LEVELING?.XP_MULTIPLIER || 1.0) * guildXpMulti);

    // Atomic update for XP. Returns {xp, level} from the row (RETURNING clause)
    const userState = await db.addGlobalXp(userId, finalAmount);
    if (!userState) return { level: 0, leveledUp: false };

    const currentXp = Number(userState.xp);
    const oldLevel = Number(userState.level);
    const newLevel = calculateLevel(currentXp);

    const leveledUp = newLevel > oldLevel;
    let bonus = 0;

    if (leveledUp) {
        // Atomic update of the level field only if it changed
        await db.setGlobalLevel(userId, newLevel);

        // Base bonus
        bonus = newLevel * 100;

        // Milestone Reward (Every X levels)
        const milestone = config.ECONOMY?.LEVELING?.MILESTONE_INTERVAL || 20;
        const reachedMilestone = Math.floor(newLevel / milestone) > Math.floor(oldLevel / milestone);

        if (reachedMilestone) {
            // Increment permanent milestone points
            await db.execute('UPDATE users SET milestone_count = milestone_count + 1 WHERE id = ?', [userId]);

            userState.reachedMilestone = true;
            userState.milestoneLevel = Math.floor(newLevel / milestone) * milestone;
        }

        await db.addBalance(gId, userId, bonus);
    }

    let assignedJob = null;
    if (oldLevel < 20 && newLevel >= 20) {
        assignedJob = await assignJobIfEligible(memberOrId, gId, newLevel);
    }

    return {
        level: newLevel,
        leveledUp: leveledUp,
        reachedLevel20: !!assignedJob,
        assignedJob: assignedJob,
        bonus: bonus,
        reachedMilestone: !!userState.reachedMilestone,
        milestoneLevel: userState.milestoneLevel || 0
    };
}

/**
 * Checks if a user is eligible for a job milestone and assigns one if so.
 * 
 * @param {object|string} memberOrId - Member object or user ID
 * @param {string} guildId - Guild ID
 * @param {number} level - Current level
 * @returns {boolean} - Whether a milestone was reached/job assigned
 */
async function assignJobIfEligible(memberOrId, guildId, level) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const user = await db.getUser(userId, guildId);

    // Reaching level 20 (or higher if they somehow missed it/have no job)
    const reachedLevel20 = level >= 20 && !user.job;

    if (reachedLevel20) {
        const { getLanguage, t } = require('./i18n');
        const lang = await getLanguage(userId, guildId);
        const job = await assignRandomJob(userId, guildId, lang);

        // Try to send DM if we have a member/user object
        if (typeof memberOrId === 'object' && typeof memberOrId.send === 'function') {
            const config = require('../config');
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle(t('job.milestone_title', lang))
                .setDescription(t('job.milestone_desc', lang))
                .addFields({
                    name: t('job.name_field', lang) || "Nghề nghiệp",
                    value: t('job.milestone_assigned', lang, {
                        job: job.name,
                        icon: job.config.icon,
                        fact: job.fact,
                        prefix: config.PREFIX
                    })
                })
                .setColor(job.config.color || '#f1c40f')
                .setTimestamp();

            memberOrId.send({ embeds: [embed] }).catch(() => {
                console.log(`[Job Milestone] Failed to send DM to ${userId}`);
            });
        }
        return job;
    }
    return null;
}
/**
 * Trả về hệ số nhân (multiplier) dựa trên cấp độ hiện tại.
 * Mỗi cấp độ thưởng thêm 2% (0.02).
 * Giới hạn tối đa là +200% (2.0) ở cấp 100.
 * 
 * @param {number} level - Cấp độ người dùng 
 * @returns {number} - Hệ số bonus, ví dụ: level 10 -> return 0.10 (tức +10%)
 */
function getLevelMultiplier(level) {
    const cap = 0.5; // Max 50% bonus from levels
    const multiplier = level * 0.005; // 0.5% per level
    return Math.min(multiplier, cap);
}

/**
 * Assigns a random job to a user.
 */
async function assignRandomJob(userId, guildId, lang) {
    const config = require('../config');
    const { t } = require('./i18n');

    const jobKeys = Object.keys(config.ECONOMY.JOBS).filter(key => key !== 'police_chief');
    const randomJobId = jobKeys[Math.floor(Math.random() * jobKeys.length)];
    const jobConfig = config.ECONOMY.JOBS[randomJobId];

    await db.updateUser(guildId, userId, { job: randomJobId });

    return {
        id: randomJobId,
        config: jobConfig,
        name: t(`job.name_${randomJobId}`, lang) || randomJobId,
        fact: t(`job.fact_${randomJobId}`, lang) || "..."
    };
}

// checkAndSendMilestone has been merged centrally directly into addXp.
/**
 * Gửi thông báo thăng cấp cơ bản.
 */

/**
 * Giảm cấp độ của người dùng.
 * Thường dùng làm hình phạt cho các hành vi vi phạm (ví dụ: Teacher làm việc xấu).
 * 
 * @param {string} userId - ID người dùng
 * @param {number} levels - Số cấp độ muốn giảm (mặc định là 1)
 * @returns {object} - Object chứa thông tin cấp độ cũ và mới
 */
async function deductLevel(userId, guildId, levels = 1) {
    const user = await db.getUser(userId, guildId);
    const oldLevel = Number(user.level || 0);
    const newLevel = Math.max(0, oldLevel - levels);

    // Tính toán lại XP tối thiểu cho cấp độ mới
    // XP = (Level / 0.1)^2
    const newXp = Math.floor(Math.pow(newLevel / 0.1, 2));

    await db.updateUser(guildId, userId, {
        xp: newXp,
        level: newLevel
    });

    return {
        oldLevel,
        newLevel
    };
}

/**
 * Giảm XP của người dùng.
 * Thường dùng làm hình phạt cho các hành vi rủi ro thất bại.
 * 
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số XP muốn giảm
 * @returns {object} - Object chứa thông tin cấp độ cũ và mới
 */
async function deductXp(userId, guildId, amount) {
    // Atomic update with negative amount
    const userState = await db.addGlobalXp(userId, -amount);
    if (!userState) return { deducted: 0 };

    const newXp = Math.max(0, Number(userState.xp));
    const newLevel = calculateLevel(newXp);

    // Update level to match the new XP (atomic set)
    await db.setGlobalLevel(userId, newLevel);

    return {
        newXp,
        newLevel,
        deducted: amount // This is the requested amount
    };
}

module.exports = {
    calculateLevel,
    addXp,
    assignJobIfEligible,
    getLevelMultiplier,
    assignRandomJob,

    deductLevel,
    deductXp,
    XP_AMOUNTS
};
