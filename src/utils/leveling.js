const db = require('../database');

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
    const user = db.getUser(userId);
    const newXp = user.xp + amount;
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

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const { t } = require('./i18n');

    const embed = new EmbedBuilder()
        .setTitle(t('job.milestone_title', lang))
        .setDescription(t('job.milestone_desc', lang))
        .setColor('#f1c40f');

    const btn = new ButtonBuilder()
        .setCustomId('choose_job_btn')
        .setLabel(t('job.choose_button', lang))
        .setStyle(ButtonStyle.Success)
        .setEmoji('💼');

    const row = new ActionRowBuilder().addComponents(btn);

    // Nếu là interaction (Slash command), gửi ephemeral
    if (message.deferred || message.replied || typeof message.editReply === 'function') {
        return message.followUp({
            embeds: [embed],
            components: [row],
            ephemeral: true
        }).catch(() => { });
    } else {
        // Gửi DM riêng tư cho người chơi — người khác không nhìn thấy
        try {
            const dmChannel = await message.author.createDM();
            await dmChannel.send({ embeds: [embed], components: [row] });
        } catch {
            // Assign random job if DM fails
            const config = require('../config');
            const jobKeys = Object.keys(config.ECONOMY.JOBS);
            const randomJobId = jobKeys[Math.floor(Math.random() * jobKeys.length)];
            const job = config.ECONOMY.JOBS[randomJobId];

            db.updateUser(message.author.id, { job: randomJobId });

            const jobName = randomJobId.charAt(0).toUpperCase() + randomJobId.slice(1);
            const notice = await message.channel.send({
                content: `<@${message.author.id}> ${t('job.dm_disabled_random', lang, { job: jobName, prefix: config.PREFIX })}`,
            }).catch(() => null);
            if (notice) setTimeout(() => notice.delete().catch(() => { }), 15000);
        }
    }
}

module.exports = {
    calculateLevel,
    addXp,
    getLevelMultiplier,
    checkAndSendMilestone
};
