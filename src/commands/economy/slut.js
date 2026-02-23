const db = require('../../database');
const { deductLevel } = require('../../utils/leveling');
const { calculateReward } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'slut',
    aliases: ['sl'],
    description: 'Đi khách để kiếm tiền',
    cooldown: config.ECONOMY.SLUT_COOLDOWN,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.SLUT_COOLDOWN;

        if (now - user.last_slut < cooldown) {
            const remaining = (user.last_slut + cooldown) - now;
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.ceil((remaining % 3600) / 60);
            return message.reply(t('slut.cooldown', lang, { hours, minutes }));
        }

        const isSuccess = Math.random() < config.ECONOMY.SLUT_SUCCESS_RATE;
        const actions = t('slut.actions', lang);
        const action = actions[Math.floor(Math.random() * actions.length)];

        db.updateUser(message.author.id, { last_slut: now });

        if (isSuccess) {
            const minReward = config.ECONOMY.SLUT_MIN_REWARD;
            const maxReward = config.ECONOMY.SLUT_MAX_REWARD;
            let baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            // Job Bonus: Musician (20%) or Streamer (15%)
            let performMsg = '';
            let streamMsg = '';
            if (user.job === 'musician') {
                baseReward = Math.floor(baseReward * 1.2);
                performMsg = t('slut.musician_bonus', lang, { amount: Math.floor(baseReward * 0.2).toLocaleString() });
            } else if (user.job === 'streamer') {
                baseReward = Math.floor(baseReward * 1.15);
                streamMsg = t('slut.streamer_bonus', lang, { amount: Math.floor(baseReward * 0.15).toLocaleString() });
            }

            const { total, bonus: bonusAmount } = calculateReward(baseReward, message.author.id);



            db.addBalance(message.author.id, total);

            let msg = t('slut.success', lang, {
                action,
                amount: total.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonusAmount > 0) {
                msg += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 250%)' : 'Includes 🎁 Bonus (Capped 250%)'}: +${bonusAmount.toLocaleString()} coins)*`;
            }
            if (performMsg) msg += performMsg;
            if (streamMsg) msg += streamMsg;

            return message.reply(msg);
        } else {
            let penalty = config.ECONOMY.SLUT_FAIL_PENALTY;
            if (user.job === 'doctor') penalty = Math.floor(penalty / 2); // 50% discount for doctors

            db.addBalance(message.author.id, -penalty);

            // Interaction: Transfer penalty to a random Doctor
            const randomDoctor = db.getRandomUserByJob('doctor', message.author.id);
            if (randomDoctor) {
                db.addBalance(randomDoctor.id, penalty);

                const doctorUser = message.guild.members.cache.get(randomDoctor.id);
                let failureMsg = t('slut.failure', lang, { amount: penalty.toLocaleString() });

                if (user.job === 'teacher') {
                    const result = deductLevel(message.author.id);
                    failureMsg += `\n👨‍🏫 **Teacher Penalty:** ${t('slut.teacher_penalty', lang, { level: result.newLevel })}`;
                }

                if (doctorUser) {
                    failureMsg += `\n${t('job.doctor_notification', lang, { amount: penalty.toLocaleString() }).replace('👨‍⚕️ **Bệnh viện:** ', '').replace('👨‍⚕️ **Hospital:** ', '')} (<@${randomDoctor.id}>)`;
                }

                return;
            }

            let failMsg = t('slut.failure', lang, { amount: penalty.toLocaleString() });
            if (user.job === 'teacher') {
                const result = deductLevel(message.author.id);
                failMsg += `\n👨‍🏫 **Teacher Penalty:** ${t('slut.teacher_penalty', lang, { level: result.newLevel })}`;
            }

            return message.reply(failMsg);
        }
    }
};
