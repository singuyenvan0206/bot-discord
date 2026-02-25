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
function addXp(userId, amount) {
    const config = require('../config');
    const user = db.getUser(userId);

    // Apply global and user-specific XP multipliers
    const { getXpMultiplier } = require('./multiplier');
    const multiplier = (config.ECONOMY?.LEVELING?.XP_MULTIPLIER || 1.0) * getXpMultiplier(userId);
    const finalAmount = Math.floor(amount * multiplier);

    const xp = Number(user.xp || 0);
    const level = Number(user.level || 0);
    const newXp = xp + finalAmount;
    const newLevel = calculateLevel(newXp);

    const leveledUp = newLevel > level;
    // Milestone: Reaching level 20 (or higher if they somehow missed it/have no job)
    const reachedLevel20 = newLevel >= 20 && !user.job;

    let bonus = 0;
    if (leveledUp) {
        bonus = newLevel * 100;
        db.addBalance(userId, bonus);
    }

    db.updateUser(userId, {
        xp: newXp,
        level: newLevel
    });

    return {
        level: newLevel,
        leveledUp: leveledUp,
        reachedLevel20: reachedLevel20,
        bonus: bonus
    };
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
function assignRandomJob(userId, lang) {
    const config = require('../config');
    const { t } = require('./i18n');

    const jobKeys = Object.keys(config.ECONOMY.JOBS);
    const randomJobId = jobKeys[Math.floor(Math.random() * jobKeys.length)];
    const jobConfig = config.ECONOMY.JOBS[randomJobId];

    db.updateUser(userId, { job: randomJobId });

    return {
        id: randomJobId,
        config: jobConfig,
        name: t(`job.name_${randomJobId}`, lang) || randomJobId,
        fact: t(`job.fact_${randomJobId}`, lang) || "..."
    };
}

/**
 * Kiểm tra và gửi thông báo đạt mốc Cấp độ 20.
 */
async function checkAndSendMilestone(message, reachedLevel20, lang) {
    if (!reachedLevel20) return;

    const { EmbedBuilder } = require('discord.js');
    const config = require('../config');
    const { t } = require('./i18n');

    // Assign job
    const job = assignRandomJob(message.author.id, lang);

    // Prepare announcement
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
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor(job.config.color || '#f1c40f')
        .setTimestamp();

    // Send announcement as DM (only visible to the user)
    try {
        await message.author.send({ embeds: [embed] });
    } catch {
        // Fallback: user has DMs disabled
        await message.channel.send({
            content: `<@${message.author.id}>`,
            embeds: [embed]
        }).catch(() => { });
    }
}

/**
 * Gửi thông báo thăng cấp cơ bản.
 */
async function sendLevelUpMessage(message, level, bonus, lang) {
    const { EmbedBuilder } = require('discord.js');
    const { t } = require('./i18n');
    const config = require('../config');

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
function deductLevel(userId, levels = 1) {
    const user = db.getUser(userId);
    const oldLevel = Number(user.level || 0);
    const newLevel = Math.max(0, oldLevel - levels);

    // Tính toán lại XP tối thiểu cho cấp độ mới
    // XP = (Level / 0.1)^2
    const newXp = Math.floor(Math.pow(newLevel / 0.1, 2));

    db.updateUser(userId, {
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
function deductXp(userId, amount) {
    const user = db.getUser(userId);
    const oldXp = Number(user.xp || 0);
    const oldLevel = Number(user.level || 0);

    const newXp = Math.max(0, oldXp - amount);
    const newLevel = calculateLevel(newXp);

    db.updateUser(userId, {
        xp: newXp,
        level: newLevel
    });

    return {
        oldXp,
        newXp,
        oldLevel,
        newLevel,
        deducted: oldXp - newXp
    };
}

module.exports = {
    calculateLevel,
    addXp,
    getLevelMultiplier,
    assignRandomJob,
    checkAndSendMilestone,
    sendLevelUpMessage,
    deductLevel,
    deductXp,
    XP_AMOUNTS
};
