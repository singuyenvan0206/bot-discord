const db = require('../../database');
const { getUserMultiplier, getTotalIncomeMultiplier, hasActiveItem, calculateReward } = require('../../utils/multiplier');
const { getLevelMultiplier } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { formatDuration } = require('../../utils/time'); // Assuming formatDuration is available

module.exports = {
    name: 'work',
    aliases: ['wk', 'w'],
    description: 'Xây dựng sự nghiệp và tạo thu nhập (Build your career and earn income)',
    cooldown: config.ECONOMY.WORK_COOLDOWN,
    async execute(message, args) {
        const { client } = message; // Added this line as per the edit, assuming it's needed later
        const lang = await getLanguage(message.author.id, message.guild?.id);

        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        const cooldown = await db.getGuildSetting(message.guild.id, 'work_cooldown', config.ECONOMY.WORK_COOLDOWN);
        const lastWork = Number(user.last_work || 0);

        if (now - lastWork < cooldown) {
            const timeLeft = cooldown - (now - lastWork);
            return message.reply(t('work.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const categories = t('work.job_categories', lang);
        let availableJobs = [...categories.tier0];

        if (user.level >= 5) availableJobs.push(...categories.tier5);
        if (user.level >= 10) availableJobs.push(...categories.tier10);
        const level = user.level;
        let jobName;

        if (user.job) {
            jobName = t(`job.name_${user.job}`, lang) || user.job.charAt(0).toUpperCase() + user.job.slice(1);
        } else {
            let jobs = categories.tier0;
            if (level >= 20) jobs = categories.tier20;
            else if (level >= 10) jobs = categories.tier10;
            else if (level >= 5) jobs = categories.tier5;

            jobName = jobs[Math.floor(Math.random() * jobs.length)];
        }

        const minReward = await db.getGuildSetting(message.guild.id, 'work_min', config.ECONOMY.MIN_WORK_EARNINGS);
        const maxReward = await db.getGuildSetting(message.guild.id, 'work_max', config.ECONOMY.MAX_WORK_EARNINGS);
        const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
        let { total, bonus, percent } = await calculateReward(baseReward, message.member, 'income', { category: 'work' });


        // Farmer Interaction: Bumper Crop (20% chance)
        let bumperMsg = '';
        if (user.job === 'farmer' && Math.random() < 0.15) {
            total = Math.floor(total * 1.5);
            bonus = Math.floor(bonus * 1.5);
            bumperMsg = t('work.bumper_crop', lang);
        }

        // Police Interaction: Overtime (40% chance +1500 flat)
        let overtimeMsg = '';
        if (user.job === 'police' && Math.random() < 0.30) {
            total += 500;
            overtimeMsg = t('work.overtime', lang);
        }

        await db.addBalance(message.guild.id, message.author.id, total);
        await db.updateUser(message.guild.id, message.author.id, { last_work: now });

        let msg = t('work.success', lang, { job: jobName, amount: total.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (bonus > 0) {
            msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
        }

        if (bumperMsg) msg += bumperMsg;
        if (overtimeMsg) msg += overtimeMsg;

        await message.reply(msg);
    }
};
