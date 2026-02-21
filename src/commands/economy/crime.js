const db = require('../../database');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
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
        const successRate = config.ECONOMY.CRIME_SUCCESS_RATE + (isCriminal ? 0.1 : 0);
        const isSuccess = Math.random() < successRate;
        const actions = t('crime.actions', lang);
        const action = actions[Math.floor(Math.random() * actions.length)];

        db.updateUser(message.author.id, { last_crime: now });

        if (isSuccess) {
            const minReward = config.ECONOMY.CRIME_MIN_REWARD;
            const maxReward = config.ECONOMY.CRIME_MAX_REWARD;
            let baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            let jobMultiplier = 0;
            if (isCriminal) jobMultiplier = 0.2;
            const isHacker = user.job === 'hacker';
            if (isHacker) jobMultiplier = 0.25;

            const jobBonusAmount = Math.floor(baseReward * jobMultiplier);
            const levelMultiplier = getLevelMultiplier(user.level);
            const levelBonus = Math.floor(baseReward * levelMultiplier);
            const total = baseReward + levelBonus + jobBonusAmount;

            // Crimes give more XP (50-100)
            const xpGained = Math.floor(Math.random() * 51) + 50;
            const xpResult = addXp(message.author.id, xpGained);

            db.addBalance(message.author.id, total);

            let msg = t('crime.success', lang, {
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

            if (jobBonusAmount > 0) {
                const jName = isCriminal ? t('job.info_criminal', lang).split(':')[0] : t('job.info_hacker', lang).split(':')[0];
                msg += `\n✨ **${t('job.name_field', lang)} Bonus (${jName}):** +${jobBonusAmount.toLocaleString()} coins (${Math.round(jobMultiplier * 100)}%)!`;
            }

            await message.reply(msg);
            return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
        } else {
            const fine = Math.floor(user.balance * config.ECONOMY.CRIME_FINE_PERCENT);
            db.addBalance(message.author.id, -fine);

            // Interaction: Transfer fine to a random Police
            const randomPolice = db.getRandomUserByJob('police', message.author.id);
            if (randomPolice) {
                db.addBalance(randomPolice.id, fine);

                // If the user is cached/fetched, we could send them a DM, but for now we've added the balance.
                // We'll mention them in the message if they are in the guild.
                const policeUser = message.guild.members.cache.get(randomPolice.id);
                let failureMsg = t('crime.failure', lang, { amount: fine.toLocaleString() });

                if (policeUser) {
                    failureMsg += `\n${t('job.police_notification', lang, { amount: fine.toLocaleString() }).replace('👮 **Trực ban:** ', '').replace('👮 **On Duty:** ', '')} (<@${randomPolice.id}>)`;
                }

                await message.reply(failureMsg);
                // Even on failure, XP is added (but not yet in the original code, let's add it)
                const xpGained = 10;
                const xpResult = addXp(message.author.id, xpGained);
                return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
            }

            await message.reply(t('crime.failure', lang, { amount: fine.toLocaleString() }));
            const xpGained = 10;
            const xpResult = addXp(message.author.id, xpGained);
            return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
        }
    }
};
