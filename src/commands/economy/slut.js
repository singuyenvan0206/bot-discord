const db = require('../../database');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
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
            const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            const levelMultiplier = getLevelMultiplier(user.level);
            const levelBonus = Math.floor(baseReward * levelMultiplier);
            const total = baseReward + levelBonus;

            // Slut gives medium XP (30-60)
            const xpGained = Math.floor(Math.random() * 31) + 30;
            const xpResult = addXp(message.author.id, xpGained);

            db.addBalance(message.author.id, total);

            let msg = t('slut.success', lang, {
                action,
                amount: baseReward.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (levelBonus > 0) {
                msg += t('work.level_bonus', lang, {
                    amount: levelBonus.toLocaleString(),
                    percent: Math.round(levelMultiplier * 100)
                });
            }

            await message.reply(msg);
            return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
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

                if (doctorUser) {
                    failureMsg += `\n${t('job.doctor_notification', lang, { amount: penalty.toLocaleString() }).replace('👨‍⚕️ **Bệnh viện:** ', '').replace('👨‍⚕️ **Hospital:** ', '')} (<@${randomDoctor.id}>)`;
                }

                await message.reply(failureMsg);
                const xpResult = addXp(message.author.id, 5); // 5 XP for failed attempt
                return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
            }

            await message.reply(t('slut.failure', lang, { amount: penalty.toLocaleString() }));
            const xpResult = addXp(message.author.id, 5);
            return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
        }
    }
};
