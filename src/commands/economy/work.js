const db = require('../../database');
const { getUserMultiplier, getTotalIncomeMultiplier, hasActiveItem, calculateReward } = require('../../utils/multiplier');
const { getLevelMultiplier } = require('../../utils/leveling');
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

        if (user.job) {
            jobName = user.job.charAt(0).toUpperCase() + user.job.slice(1);
        } else {
            const categories = t('work.job_categories', lang);
            let jobs = categories.tier0;
            if (level >= 20) jobs = categories.tier20;
            else if (level >= 10) jobs = categories.tier10;
            else if (level >= 5) jobs = categories.tier5;

            jobName = jobs[Math.floor(Math.random() * jobs.length)];
        }

        const baseReward = Math.floor(Math.random() * 401) + 100; // 100-500
        let { total, bonus: bonusAmount } = calculateReward(baseReward, message.author.id);

        // Streamer Interaction: Go Viral (5% chance ×5 if using Chair/Mansion)
        let viralMsg = '';
        if (user.job === 'streamer' && (hasActiveItem(message.author.id, 220) || hasActiveItem(message.author.id, 107)) && Math.random() < 0.05) {
            total *= 5;
            bonusAmount *= 5;
            viralMsg = t('work.viral', lang);
        }

        // Farmer Interaction: Bumper Crop (10% chance ×2.5)
        let bumperMsg = '';
        if (user.job === 'farmer' && Math.random() < 0.1) {
            total = Math.floor(total * 2.5);
            bonusAmount = Math.floor(bonusAmount * 2.5);
            bumperMsg = t('work.bumper_crop', lang);
        }

        // Chef Interaction: Special Order (8% chance ×2)
        let specialOrderMsg = '';
        if (user.job === 'chef' && Math.random() < 0.08) {
            total = Math.floor(total * 2);
            bonusAmount = Math.floor(bonusAmount * 2);
            specialOrderMsg = t('work.special_order', lang);
        }

        // Soldier Interaction: Mission Bonus (+100 flat)
        let missionMsg = '';
        if (user.job === 'soldier') {
            total += 100;
            missionMsg = t('work.mission_bonus', lang);
        }



        db.addBalance(message.author.id, total);
        db.updateUser(message.author.id, { last_work: now });

        let msg = t('work.success', lang, { job: jobName, amount: total.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (bonusAmount > 0) {
            msg += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 250%)' : 'Includes 🎁 Bonus (Capped 250%)'}: +${bonusAmount.toLocaleString()} coins)*`;
        }

        if (viralMsg) msg += viralMsg;
        if (bumperMsg) msg += bumperMsg;
        if (specialOrderMsg) msg += specialOrderMsg;
        if (missionMsg) msg += missionMsg;

        await message.reply(msg);
    }
};
