const db = require('../../database');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'search',
    description: 'Search random locations for some coins',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.SEARCH_COOLDOWN;

        if (now - user.last_search < cooldown) {
            const remaining = (user.last_search + cooldown) - now;
            const minutes = Math.ceil(remaining / 60);
            return message.reply(t('search.cooldown', lang, { minutes }));
        }

        db.updateUser(message.author.id, { last_search: now });

        const locations = t('search.locations', lang);
        const location = locations[Math.floor(Math.random() * locations.length)];

        const minReward = config.ECONOMY.SEARCH_MIN_REWARD;
        const maxReward = config.ECONOMY.SEARCH_MAX_REWARD;
        const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

        const levelMultiplier = getLevelMultiplier(user.level);
        const levelBonus = Math.floor(baseReward * levelMultiplier);

        let jobMultiplier = 0;
        let jobName = '';
        if (user.job === 'hacker') {
            const jobConfig = config.ECONOMY.JOBS.hacker;
            jobMultiplier = jobConfig.bonus;
            jobName = t('job.info_hacker', lang).split(':')[0]; // Get the name
        }

        const jobBonusAmount = Math.floor(baseReward * jobMultiplier);
        const total = baseReward + levelBonus + jobBonusAmount;

        // Medium XP (10-20)
        const xpGained = Math.floor(Math.random() * 11) + 10;
        const xpResult = addXp(message.author.id, xpGained);

        db.addBalance(message.author.id, total);

        let msg = t('search.success', lang, {
            location,
            amount: baseReward.toLocaleString(),
            emoji: config.EMOJIS.COIN
        });

        if (levelBonus > 0) {
            msg += t('search.level_bonus', lang, {
                amount: levelBonus.toLocaleString(),
                percent: Math.round(levelMultiplier * 100)
            });
        }

        if (jobBonusAmount > 0) {
            msg += `\n✨ **${t('job.name_field', lang)} Bonus (${jobName}):** +${jobBonusAmount.toLocaleString()} coins (${Math.round(jobMultiplier * 100)}%)!`;
        }

        await message.reply(msg);
        return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
    }
};
