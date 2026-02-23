const db = require('../database');

/**
 * XP Constants
 */
const XP_AMOUNTS = {
    MESSAGE: { min: 5, max: 15 },
    COMMAND_SUCCESS: { min: 20, max: 40 },
    COMMAND_FAILURE: { min: 5, max: 10 }
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

    // Apply global XP multiplier
    const multiplier = config.ECONOMY?.LEVELING?.XP_MULTIPLIER || 1.0;
    const finalAmount = Math.floor(amount * multiplier);

    const newXp = user.xp + finalAmount;
    const newLevel = calculateLevel(newXp);

    const leveledUp = newLevel > user.level;
    const reachedLevel20 = leveledUp && newLevel >= 20 && user.level < 20;

    db.updateUser(userId, {
        xp: newXp,
        level: newLevel
    });

    return {
        level: newLevel,
        leveledUp: leveledUp,
        reachedLevel20: reachedLevel20
    };
}

/**
 * Trả về hệ số nhân (multiplier) dựa trên cấp độ hiện tại.
 * Mỗi cấp độ thưởng thêm 1% (0.01).
 * Giới hạn tối đa là +100% (1.0) ở cấp 100.
 * 
 * @param {number} level - Cấp độ người dùng 
 * @returns {number} - Hệ số bonus, ví dụ: level 10 -> return 0.10 (tức +10%)
 */
function getLevelMultiplier(level) {
    const cap = 1.0;
    const multiplier = level * 0.01;
    return Math.min(multiplier, cap);
}

/**
 * Kiểm tra và gửi thông báo đạt mốc Cấp độ 20.
 */
async function checkAndSendMilestone(message, reachedLevel20, lang) {
    if (!reachedLevel20) return;

    const { EmbedBuilder } = require('discord.js');
    const { t } = require('./i18n');
    const config = require('../config');

    // 1. Pick a random job
    const jobKeys = Object.keys(config.ECONOMY.JOBS);
    const randomJobId = jobKeys[Math.floor(Math.random() * jobKeys.length)];
    const jobConfig = config.ECONOMY.JOBS[randomJobId];

    // 2. Update user in database
    db.updateUser(message.author.id, { job: randomJobId });

    // 3. Prepare announcement
    const jobName = t(`jobs.${randomJobId}.name`, lang) || randomJobId;
    const jobFact = t(`job.job_facts.${randomJobId}`, lang) || "...";

    const embed = new EmbedBuilder()
        .setTitle(t('job.milestone_title', lang))
        .setDescription(t('job.milestone_desc', lang))
        .addFields({
            name: t('job.name_field', lang) || "Nghề nghiệp",
            value: t('job.milestone_assigned', lang, {
                job: jobName,
                icon: jobConfig.icon,
                fact: jobFact,
                prefix: config.PREFIX
            })
        })
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor(jobConfig.color || '#f1c40f')
        .setTimestamp();

    // 4. Send announcement as DM (only visible to the user)
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
 * Giảm cấp độ của người dùng.
 * Thường dùng làm hình phạt cho các hành vi vi phạm (ví dụ: Teacher làm việc xấu).
 * 
 * @param {string} userId - ID người dùng
 * @param {number} levels - Số cấp độ muốn giảm (mặc định là 1)
 * @returns {object} - Object chứa thông tin cấp độ cũ và mới
 */
function deductLevel(userId, levels = 1) {
    const user = db.getUser(userId);
    const oldLevel = user.level;
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

module.exports = {
    calculateLevel,
    addXp,
    getLevelMultiplier,
    checkAndSendMilestone,
    deductLevel,
    XP_AMOUNTS
};
