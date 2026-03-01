const db = require('../../database');
const { deductLevel, deductXp } = require('../../utils/leveling');
const { calculateReward } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'slut',
    aliases: ['sl', 'slt'],
    description: 'Đi khách (Work as slut)',
    cooldown: config.ECONOMY.SLUT_COOLDOWN,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        const cooldown = await db.getGuildSetting(message.guild.id, 'slut_cooldown', config.ECONOMY.SLUT_COOLDOWN);
        const lastSlut = Number(user.last_slut || 0);

        if (now - lastSlut < cooldown) {
            const timeLeft = cooldown - (now - lastSlut);
            return message.reply(t('slut.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const successRate = await db.getGuildSetting(message.guild.id, 'slut_rate', config.ECONOMY.SLUT_SUCCESS_RATE);
        const actions = t('slut.actions', lang);
        const action = actions[Math.floor(Math.random() * actions.length)];

        await db.updateUser(message.guild.id, message.author.id, { last_slut: now });

        if (Math.random() < successRate) {
            const minReward = await db.getGuildSetting(message.guild.id, 'slut_min', config.ECONOMY.SLUT_MIN_REWARD);
            const maxReward = await db.getGuildSetting(message.guild.id, 'slut_max', config.ECONOMY.SLUT_MAX_REWARD);
            let baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            // Job Bonus: Musician (20%) or Streamer (15%)
            let performMsg = '';
            let streamMsg = '';
            if (user.job === 'musician') {
                const bonusValue = Math.floor(baseReward * 0.2);
                baseReward += bonusValue;
                performMsg = t('slut.musician_bonus', lang, { amount: bonusValue.toLocaleString() });
            } else if (user.job === 'streamer') {
                const bonusValue = Math.floor(baseReward * 0.15);
                baseReward += bonusValue;
                streamMsg = t('slut.streamer_bonus', lang, { amount: bonusValue.toLocaleString() });
            }

            const { total, bonus, percent } = await calculateReward(baseReward, message.member, 'income');

            await db.addBalance(message.guild.id, message.author.id, total);

            let msg = t('slut.success', lang, {
                action,
                amount: total.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonus > 0) {
                msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
            }
            if (performMsg) msg += performMsg;
            if (streamMsg) msg += streamMsg;

            return message.reply(msg);
        } else {
            // New Scaled Penalty: 200 + (2% of balance)
            let penalty = 200 + Math.floor((user.balance || 0) * 0.02);
            const xpLoss = 30;

            if (user.job === 'doctor') penalty = Math.floor(penalty / 2); // 50% discount for doctors

            const xpResult = await deductXp(message.author.id, message.guild.id, xpLoss);
            await db.removeBalance(message.guild.id, message.author.id, penalty);

            // Cooldown Penalty: Hospital Time (1.5x cooldown)
            const hospitalCooldown = Math.floor(cooldown * 0.5);
            await db.updateUser(message.guild.id, message.author.id, { last_slut: now + hospitalCooldown });

            // Interaction: Transfer penalty to a random Doctor in the guild
            const randomDoctorId = await db.getRandomUserByJob('doctor', [message.client.user.id]);
            if (randomDoctorId) {
                await db.addBalance(message.guild.id, randomDoctorId, penalty);

                const doctorUser = message.guild?.members?.cache.get(randomDoctorId);
                let failureMsg = t('slut.failure_xp', lang, {
                    amount: penalty.toLocaleString(),
                    xp: xpResult.deducted.toLocaleString(),
                    hospital: t('common.hospital_time', lang)
                });

                if (user.job === 'teacher') {
                    const result = await deductLevel(message.author.id, message.guild.id);
                    failureMsg += `\n${t('common.teacher_penalty_label', lang)}${t('slut.teacher_penalty', lang, { level: result.newLevel })}`;
                }

                if (doctorUser) {
                    failureMsg += `\n${t('job.doctor_notification', lang, { amount: penalty.toLocaleString() }).replace('👨‍⚕️ **Bệnh viện:** ', '').replace('👨‍⚕️ **Hospital:** ', '')} (<@${randomDoctorId}>)`;
                }

                return message.reply(failureMsg);
            }

            let failMsg = t('slut.failure_xp', lang, {
                amount: penalty.toLocaleString(),
                xp: xpResult.deducted.toLocaleString(),
                hospital: t('common.hospital_time', lang)
            });
            if (user.job === 'teacher') {
                const result = await deductLevel(message.author.id, message.guild.id);
                failMsg += `\n${t('common.teacher_penalty_label', lang)}${t('slut.teacher_penalty', lang, { level: result.newLevel })}`;
            }

            return message.reply(failMsg);
        }
    }
};
