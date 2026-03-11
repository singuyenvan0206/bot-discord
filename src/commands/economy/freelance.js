const db = require('../../database');
const { deductXp, deductLevel } = require('../../utils/leveling');
const { calculateReward } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { formatRewardMessage } = require('../../utils/formatter');

module.exports = {
    name: 'freelance',
    aliases: ['fl', 'free'],
    description: 'Làm việc tự do (Freelance work)',
    cooldown: config.ECONOMY.FREELANCE_COOLDOWN,
    manualCooldown: true, // Handle delay penalty manually
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        // Sync memory cooldown
        const timestamps = message.client.cooldowns.get('freelance');
        if (timestamps) timestamps.set(message.author.id, Date.now());

        await db.updateUser(message.guild.id, message.author.id, { last_freelance: now });

        const successRate = await db.getGuildSetting(message.guild.id, 'freelance_rate', config.ECONOMY.FREELANCE_SUCCESS_RATE);
        const actions = t('freelance.actions', lang);
        const action = actions[Math.floor(Math.random() * actions.length)];

        if (Math.random() < successRate) {
            const minReward = await db.getGuildSetting(message.guild.id, 'freelance_min', config.ECONOMY.FREELANCE_MIN_REWARD);
            const maxReward = await db.getGuildSetting(message.guild.id, 'freelance_max', config.ECONOMY.FREELANCE_MAX_REWARD);
            let baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            const rewardData = await calculateReward(baseReward, message.member, 'income');
            await db.addBalance(message.guild.id, message.author.id, rewardData.total);

            return message.reply(formatRewardMessage('freelance.success', lang, { ...rewardData, action }));
        } else {
            let penalty = 200 + Math.floor((user.balance || 0) * 0.02);
            const xpLoss = 30;

            const xpResult = await deductXp(message.author.id, message.guild.id, xpLoss);
            await db.removeBalance(message.guild.id, message.author.id, penalty);

            const cooldown = await db.getGuildSetting(message.guild.id, 'freelance_cooldown', config.ECONOMY.FREELANCE_COOLDOWN);
            const delayCooldown = Math.floor(cooldown * 0.5);
            await db.updateUser(message.guild.id, message.author.id, { last_freelance: now + delayCooldown });

            if (timestamps) timestamps.set(message.author.id, (now + delayCooldown) * 1000);

            let failMsg = t('freelance.failure_xp', lang, {
                amount: penalty.toLocaleString(),
                xp: xpResult.deducted.toLocaleString(),
                hospital: t('common.hospital_time', lang)
            });
            if (user.job === 'teacher') {
                const result = await deductLevel(message.author.id, message.guild.id);
                failMsg += `\n${t('common.teacher_penalty_label', lang)}${t('freelance.teacher_penalty', lang, { level: result.newLevel.toLocaleString() })}`;
            }

            return message.reply(failMsg);
        }
    }
};
