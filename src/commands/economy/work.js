const db = require('../../database');
const { getUserMultiplier } = require('../../utils/multiplier');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'work',
    aliases: ['w', 'wk'],
    description: 'Làm việc để kiếm tiền',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.WORK_COOLDOWN;

        if (now - user.last_work < cooldown) {
            const remaining = (user.last_work + cooldown) - now;
            const minutes = Math.ceil(remaining / 60);
            return message.reply(t('work.cooldown', lang, { minutes }));
        }

        const categories = t('work.job_categories', lang);
        let availableJobs = [...categories.tier0];

        if (user.level >= 5) availableJobs.push(...categories.tier5);
        if (user.level >= 10) availableJobs.push(...categories.tier10);
        const level = user.level;
        let jobName;
        let jobMultiplier = 0;

        if (user.job) {
            const jobConfig = config.ECONOMY.JOBS[user.job];
            jobName = user.job.charAt(0).toUpperCase() + user.job.slice(1);
            jobMultiplier = jobConfig ? jobConfig.bonus : 0;
        } else {
            const categories = t('work.job_categories', lang);
            let jobs = categories.tier0;
            if (level >= 20) jobs = categories.tier20;
            else if (level >= 10) jobs = categories.tier10;
            else if (level >= 5) jobs = categories.tier5;

            jobName = jobs[Math.floor(Math.random() * jobs.length)];
        }

        const baseReward = Math.floor(Math.random() * 401) + 100; // 100-500
        const multiplier = getUserMultiplier(message.author.id, 'income');
        const levelMultiplier = getLevelMultiplier(level);

        const itemBonus = Math.floor(baseReward * multiplier);
        const levelBonus = Math.floor(baseReward * levelMultiplier);
        const jobBonusAmount = Math.floor(baseReward * jobMultiplier);

        const total = baseReward + itemBonus + levelBonus + jobBonusAmount;

        // Add random XP
        const xpGained = Math.floor(Math.random() * 16) + 15;
        const xpResult = addXp(message.author.id, xpGained);

        db.updateUser(message.author.id, { last_work: now });
        db.addBalance(message.author.id, total);

        let msg = t('work.success', lang, { job: jobName, amount: baseReward.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (itemBonus > 0) {
            msg += t('work.bonus', lang, { amount: itemBonus.toLocaleString(), percent: Math.round(multiplier * 100) });
        }
        if (levelBonus > 0) {
            msg += t('work.level_bonus', lang, { amount: levelBonus.toLocaleString(), percent: Math.round(levelMultiplier * 100) });
        }

        if (jobBonusAmount > 0) {
            msg += t('work.job_bonus', lang, { job: jobName, amount: jobBonusAmount.toLocaleString(), percent: Math.round(jobMultiplier * 100) });
        }

        await message.reply(msg);

        // Trigger Level 20 milestone if reached
        return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
    }
};
