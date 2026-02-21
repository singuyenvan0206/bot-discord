const db = require('../../database');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'beg',
    description: 'Beg kind strangers for some coins',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.BEG_COOLDOWN;

        if (now - user.last_beg < cooldown) {
            const remaining = (user.last_beg + cooldown) - now;
            const minutes = Math.ceil(remaining / 60);
            return message.reply(t('beg.cooldown', lang, { minutes }));
        }

        db.updateUser(message.author.id, { last_beg: now });

        const isSuccess = Math.random() < config.ECONOMY.BEG_SUCCESS_RATE;

        if (isSuccess) {
            const minReward = config.ECONOMY.BEG_MIN_REWARD;
            const maxReward = config.ECONOMY.BEG_MAX_REWARD;
            const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            const levelMultiplier = getLevelMultiplier(user.level);
            const levelBonus = Math.floor(baseReward * levelMultiplier);
            const total = baseReward + levelBonus;

            // Low XP (5-10)
            const xpGained = Math.floor(Math.random() * 6) + 5;
            const xpResult = addXp(message.author.id, xpGained);

            db.addBalance(message.author.id, total);

            let msg = t('beg.success', lang, {
                amount: baseReward.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (levelBonus > 0) {
                msg += t('beg.level_bonus', lang, {
                    amount: levelBonus.toLocaleString(),
                    percent: Math.round(levelMultiplier * 100)
                });
            }

            await message.reply(msg);
            return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
        } else {
            await message.reply(t('beg.failure', lang));
            const xpResult = addXp(message.author.id, 2); // 2 XP for begging even if fail
            return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
        }
    }
};
