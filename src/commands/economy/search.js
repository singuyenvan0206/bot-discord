const db = require('../../database');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
const { getTotalIncomeMultiplier } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'search',
    description: 'Search random locations for some coins',
    cooldown: config.ECONOMY.SEARCH_COOLDOWN,
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
        if (!Array.isArray(locations) || locations.length === 0) {
            return message.reply('❌ Error: Random locations not found. Please contact admin.');
        }
        const location = locations[Math.floor(Math.random() * locations.length)];

        const minReward = config.ECONOMY.SEARCH_MIN_REWARD;
        const maxReward = config.ECONOMY.SEARCH_MAX_REWARD;
        const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

        const totalMulti = getTotalIncomeMultiplier(message.author.id);
        const bonusAmount = Math.floor(baseReward * totalMulti);
        let total = baseReward + bonusAmount;

        // Hacker Interaction: Data Mine (15% chance ×2)
        let dataMineMsg = '';
        if (user.job === 'hacker' && Math.random() < 0.15) {
            total = Math.floor(total * 2);
            dataMineMsg = t('search.data_mine', lang);
        }

        // Trader Interaction: Market Tip (+50 flat)
        let marketTipMsg = '';
        if (user.job === 'trader') {
            total += 50;
            marketTipMsg = t('search.market_tip', lang);
        }

        // Medium XP (10-20)
        const xpGained = Math.floor(Math.random() * 11) + 10;
        const xpResult = addXp(message.author.id, xpGained);

        db.addBalance(message.author.id, total);

        let msg = t('search.success', lang, {
            location,
            amount: total.toLocaleString(),
            emoji: config.EMOJIS.COIN
        });

        if (bonusAmount > 0) {
            msg += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 200%)' : 'Includes 🎁 Bonus (Capped 200%)'}: +${bonusAmount.toLocaleString()} coins)*`;
        }
        if (dataMineMsg) msg += dataMineMsg;
        if (marketTipMsg) msg += marketTipMsg;

        await message.reply(msg);
        return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
    }
};
