const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { calculateReward } = require('../../utils/multiplier');
const { formatRewardMessage } = require('../../utils/formatter');
const { handleWorkJobInteractions } = require('../../utils/jobInteractions');

module.exports = {
    name: 'work',
    aliases: ['wk', 'w'],
    description: 'Xây dựng sự nghiệp và tạo thu nhập (Build your career and earn income)',
    cooldown: config.ECONOMY.WORK_COOLDOWN,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        const level = user.level;
        let jobName;

        if (user.job) {
            jobName = t(`job.name_${user.job}`, lang) || user.job.charAt(0).toUpperCase() + user.job.slice(1);
        } else {
            const categories = t('work.job_categories', lang);
            let jobs = categories.tier0;
            if (level >= 20) jobs = categories.tier20;
            else if (level >= 10) jobs = categories.tier10;
            else if (level >= 5) jobs = categories.tier5;
            jobName = jobs[Math.floor(Math.random() * jobs.length)];
        }

        const minReward = await db.getGuildSetting(message.guild.id, 'work_min', config.ECONOMY.MIN_WORK_EARNINGS);
        const maxReward = await db.getGuildSetting(message.guild.id, 'work_max', config.ECONOMY.MAX_WORK_EARNINGS);
        const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
        let rewardData = await calculateReward(baseReward, message.member, 'income', { category: 'work' });

        // Job specific interactions
        const interactionMsg = handleWorkJobInteractions(user, lang, rewardData);

        await db.addBalance(message.guild.id, message.author.id, rewardData.total);
        await db.updateUser(message.guild.id, message.author.id, { last_work: now });

        return message.reply(formatRewardMessage('work.success', lang, { ...rewardData, job: jobName }) + interactionMsg);
    }
};
