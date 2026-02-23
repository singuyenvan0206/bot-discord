const db = require('../../database');
const { deductLevel } = require('../../utils/leveling');
const { calculateReward, hasActiveItem } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'crime',
    aliases: ['cr'],
    description: 'Thực hiện phi vụ bất hợp pháp để kiếm tiền',
    cooldown: config.ECONOMY.CRIME_COOLDOWN,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.CRIME_COOLDOWN;

        if (now - user.last_crime < cooldown) {
            const remaining = (user.last_crime + cooldown) - now;
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.ceil((remaining % 3600) / 60);
            return message.reply(t('crime.cooldown', lang, { hours, minutes }));
        }

        const isCriminal = user.job === 'criminal';
        const isHacker = user.job === 'hacker';
        let successRate = config.ECONOMY.CRIME_SUCCESS_RATE + (isCriminal ? 0.1 : 0);

        // Hacker Synergy: +5% success with high-tech gear
        if (isHacker && (hasActiveItem(message.author.id, 212) || hasActiveItem(message.author.id, 220))) {
            successRate += 0.05;
        }

        const isSuccess = Math.random() < successRate;
        const actions = t('crime.actions', lang);
        const action = actions[Math.floor(Math.random() * actions.length)];

        db.updateUser(message.author.id, { last_crime: now });

        if (isSuccess) {
            const minReward = config.ECONOMY.CRIME_MIN_REWARD;
            const maxReward = config.ECONOMY.CRIME_MAX_REWARD;
            let baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            // Hacker Interaction: Chance to double base reward if using Laptop (212) or Superyacht (220)
            let hackedMsg = '';
            if (isHacker && (hasActiveItem(message.author.id, 212) || hasActiveItem(message.author.id, 220)) && Math.random() < 0.2) {
                baseReward *= 2;
                hackedMsg = t('crime.hacker_hacked', lang);
            }

            const { total, bonus: bonusAmount } = calculateReward(baseReward, message.author.id);



            db.addBalance(message.author.id, total);

            let msg = t('crime.success', lang, {
                action,
                amount: total.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonusAmount > 0) {
                msg += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 250%)' : 'Includes 🎁 Bonus (Capped 250%)'}: +${bonusAmount.toLocaleString()} coins)*`;
            }

            if (hackedMsg) msg += hackedMsg;

            return message.reply(msg);
        } else {
            let fine = Math.floor(user.balance * config.ECONOMY.CRIME_FINE_PERCENT);

            // Doctor Interaction: Medical knowledge prevents heavy losses (50% reduction)
            if (user.job === 'doctor') {
                fine = Math.floor(fine * 0.5);
            }

            // Criminal Interaction: Escape chance with Sneakers (204) or Supercar (212)
            let escapeMsg = '';
            if (isCriminal && (hasActiveItem(message.author.id, 204) || hasActiveItem(message.author.id, 212)) && Math.random() < 0.5) {
                fine = Math.floor(fine * 0.2); // 80% reduction
                escapeMsg = t('crime.criminal_escaped', lang, { amount: fine.toLocaleString() });
            }

            // Soldier Interaction: Armed — always reduces fine by 30%
            if (user.job === 'soldier') {
                fine = Math.floor(fine * 0.7);
                escapeMsg = (escapeMsg || '') + t('crime.soldier_armed', lang);
            }

            db.removeBalance(message.author.id, fine);

            // Interaction: Transfer fine to a random Police
            const randomPoliceId = db.getRandomUserByJob('police');
            if (randomPoliceId) {
                db.addBalance(randomPoliceId, fine);

                const policeUser = message.guild?.members?.cache.get(randomPoliceId);
                let failureMsg = escapeMsg ? `❌ ${escapeMsg}` : t('crime.failure', lang, { amount: fine.toLocaleString() });

                if (user.job === 'teacher') {
                    const result = deductLevel(message.author.id);
                    failureMsg += `\n👨‍🏫 **Teacher Penalty:** ${t('crime.teacher_penalty', lang, { level: result.newLevel })}`;
                }

                if (policeUser && !escapeMsg) {
                    failureMsg += `\n${t('job.police_notification', lang, { amount: fine.toLocaleString() }).replace('👮 **Trực ban:** ', '').replace('👮 **On Duty:** ', '')} (<@${randomPoliceId}>)`;
                }

                return message.reply(failureMsg);
            }

            let failMsg = t('crime.failure', lang, { amount: fine.toLocaleString() });
            if (user.job === 'teacher') {
                const result = deductLevel(message.author.id);
                failMsg += `\n👨‍🏫 **Teacher Penalty:** ${t('crime.teacher_penalty', lang, { level: result.newLevel })}`;
            }

            return message.reply(failMsg);
        }
    }
};
