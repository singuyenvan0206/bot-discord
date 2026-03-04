const db = require('../../database');
const { deductLevel, deductXp } = require('../../utils/leveling');
const { calculateReward } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'freelance',
    aliases: ['fl', 'free'],
    description: 'Làm việc tự do (Freelance work)',
    cooldown: config.ECONOMY.FREELANCE_COOLDOWN,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        const cooldown = await db.getGuildSetting(message.guild.id, 'freelance_cooldown', config.ECONOMY.FREELANCE_COOLDOWN);
        const lastFreelance = Number(user.last_freelance || 0);

        // Check for both future timestamps (penalties) and normal cooldown
        if (lastFreelance > now || (now - lastFreelance < cooldown)) {
            const timeLeft = lastFreelance > now ? (lastFreelance - now) : (cooldown - (now - lastFreelance));
            return message.reply(t('freelance.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const successRate = await db.getGuildSetting(message.guild.id, 'freelance_rate', config.ECONOMY.FREELANCE_SUCCESS_RATE);
        const actions = t('freelance.actions', lang);
        const action = actions[Math.floor(Math.random() * actions.length)];

        // Valid attempt - Set Cooldowns
        const timestamps = message.client.cooldowns.get('freelance');
        const cooldownAmount = (this.cooldown || config.ECONOMY.FREELANCE_COOLDOWN) * 1000;
        if (timestamps) {
            timestamps.set(message.author.id, now * 1000);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        }

        await db.updateUser(message.guild.id, message.author.id, { last_freelance: now });

        if (Math.random() < successRate) {
            const minReward = await db.getGuildSetting(message.guild.id, 'freelance_min', config.ECONOMY.FREELANCE_MIN_REWARD);
            const maxReward = await db.getGuildSetting(message.guild.id, 'freelance_max', config.ECONOMY.FREELANCE_MAX_REWARD);
            let baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            const { total, bonus, percent } = await calculateReward(baseReward, message.member, 'income');

            await db.addBalance(message.guild.id, message.author.id, total);

            let msg = t('freelance.success', lang, {
                action,
                amount: total.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonus > 0) {
                msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
            }

            return message.reply(msg);
        } else {
            // Penalty Logic
            let penalty = 200 + Math.floor((user.balance || 0) * 0.02);
            const xpLoss = 30;

            const xpResult = await deductXp(message.author.id, message.guild.id, xpLoss);
            await db.removeBalance(message.guild.id, message.author.id, penalty);

            // Cooldown Penalty: Project Delay (1.5x cooldown)
            const delayCooldown = Math.floor(cooldown * 0.5);
            await db.updateUser(message.guild.id, message.author.id, { last_freelance: now + delayCooldown });

            // Memory Cooldown sync
            if (timestamps) {
                timestamps.set(message.author.id, (now + delayCooldown) * 1000);
                setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
            }

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
