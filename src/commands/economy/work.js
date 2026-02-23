const db = require('../../database');
const { getUserMultiplier, getTotalIncomeMultiplier, getXpMultiplier, hasActiveItem } = require('../../utils/multiplier');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'work',
    aliases: ['w', 'wk'],
    description: 'Làm việc để kiếm tiền',
    cooldown: config.ECONOMY.WORK_COOLDOWN,
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
        const totalMulti = getTotalIncomeMultiplier(message.author.id);
        const bonusAmount = Math.floor(baseReward * totalMulti);

        let total = baseReward + bonusAmount;

        // Streamer Interaction: Go Viral (5% chance ×5 if using Chair/Mansion)
        let viralMsg = '';
        if (user.job === 'streamer' && (hasActiveItem(message.author.id, 220) || hasActiveItem(message.author.id, 107)) && Math.random() < 0.05) {
            total *= 5;
            viralMsg = t('work.viral', lang);
        }

        // Farmer Interaction: Bumper Crop (10% chance ×2.5)
        let bumperMsg = '';
        if (user.job === 'farmer' && Math.random() < 0.1) {
            total = Math.floor(total * 2.5);
            bumperMsg = t('work.bumper_crop', lang);
        }

        // Chef Interaction: Special Order (8% chance ×2)
        let specialOrderMsg = '';
        if (user.job === 'chef' && Math.random() < 0.08) {
            total = Math.floor(total * 2);
            specialOrderMsg = t('work.special_order', lang);
        }

        // Soldier Interaction: Mission Bonus (+100 flat)
        let missionMsg = '';
        if (user.job === 'soldier') {
            total += 100;
            missionMsg = t('work.mission_bonus', lang);
        }

        // Add random XP (with teacher multiplier)
        const xpBase = Math.floor(Math.random() * 16) + 15;
        const xpMulti = getXpMultiplier(message.author.id);
        const xpGained = Math.floor(xpBase * xpMulti);
        const xpResult = addXp(message.author.id, xpGained);

        // Programmer Interaction: Tech Buff (Cooldown reduction with new IDs)
        let finalCooldown = cooldown;
        if (user.job === 'programmer' && (hasActiveItem(message.author.id, 206) || hasActiveItem(message.author.id, 207))) {
            finalCooldown = Math.floor(cooldown * 0.9); // 10% faster
        }

        db.updateUser(message.author.id, { last_work: now });
        db.addBalance(message.author.id, total);

        let msg = t('work.success', lang, { job: jobName, amount: total.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (bonusAmount > 0) {
            msg += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 200%)' : 'Includes 🎁 Bonus (Capped 200%)'}: +${bonusAmount.toLocaleString()} coins)*`;
        }

        if (viralMsg) msg += viralMsg;
        if (bumperMsg) msg += bumperMsg;
        if (specialOrderMsg) msg += specialOrderMsg;
        if (missionMsg) msg += missionMsg;

        await message.reply(msg);

        // Trigger Level 20 milestone if reached
        return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
    }
};
