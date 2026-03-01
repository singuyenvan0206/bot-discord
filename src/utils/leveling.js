const db = require('../database');

/**
 * XP Constants
 */
const XP_AMOUNTS = {
    MESSAGE: { min: 5, max: 15 },
    COMMAND_SUCCESS: { min: 20, max: 40 },
    COMMAND_FAILURE: { min: 5, max: 10 },
    GAME_WIN: { min: 30, max: 60 },
    GAME_ACTION: { min: 5, max: 10 }
};

/**
 * Tính toán cấp độ hiện tại dựa trên số XP.
 * Công thức: Level = 0.1 * sqrt(XP)  =>  XP = (Level / 0.1)^2
 */
function calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp));
}

/**
 * Thêm XP cho người dùng. 
 * Hàm này sẽ tự động cập nhật cả XP và Level trong database nhưng KHÔNG in ra thông báo thăng cấp.
 * 
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số XP muốn cộng
 * @returns {object} - Object chứa thông tin cấp độ hiện tại và việc có thăng cấp hay không { level, leveledUp }
 */
async function addXp(memberOrId, amount, guildId = null) {
    const userId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
    const gId = guildId || (memberOrId.guild ? memberOrId.guild.id : null);
    const config = require('../config');
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

    if (leveledUp) {
        // Atomic update of the level field only if it changed
        await db.setGlobalLevel(userId, newLevel);
        const bonus = newLevel * 100;
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
        bonus: bonus
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
    const cap = 2.0;
    const multiplier = level * 0.02;
    return Math.min(multiplier, cap);
}

/**
 * Assigns a random job to a user.
 */
async function assignRandomJob(userId, guildId, lang) {
    const config = require('../config');
    const { t } = require('./i18n');

    const jobKeys = Object.keys(config.ECONOMY.JOBS);
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
async function sendLevelUpMessage(message, level, bonus, lang) {
    const { EmbedBuilder } = require('discord.js');
    const { t } = require('./i18n');
    const config = require('../config');

    // ─── Channel Blacklist Check ───
    const guildBlacklistRaw = await db.getGuildSetting(message.guild.id, 'blacklisted_channels', '[]');
    let guildBlacklist = [];
    try { guildBlacklist = JSON.parse(guildBlacklistRaw); } catch (e) { guildBlacklist = []; }

    if (config.BLACKLISTED_CHANNELS.includes(message.channel.id) || guildBlacklist.includes(message.channel.id)) return;

    const embed = new EmbedBuilder()
        .setTitle(t('leveling.levelup_title', lang) || '🎉 Thăng cấp!')
        .setDescription(t('leveling.levelup_desc', lang, {
            level: level,
            bonus: bonus,
            emoji: config.EMOJIS.COIN
        }) || `Chúc mừng! Bạn đã đạt cấp độ **${level}** và nhận được **${bonus}** ${config.EMOJIS.COIN}!`)
        .setColor(config.COLORS.SUCCESS)
        .setTimestamp();

    await message.channel.send({
        content: `<@${message.author.id}>`,
        embeds: [embed]
    }).catch(() => { });
}

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
    sendLevelUpMessage,
    deductLevel,
    deductXp,
    XP_AMOUNTS
};
