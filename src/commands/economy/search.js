const db = require('../../database');
const { getLevelMultiplier } = require('../../utils/leveling');
const { getTotalIncomeMultiplier, calculateReward, hasActiveItem } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'search',
    aliases: ['s', 'find', 'sc'],
    description: 'Tìm kiếm tiền rơi ở các địa điểm ngẫu nhiên',
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
            return message.reply(`❌ ${t('common.error', lang)} (Missing locations)`);
        }
        const location = locations[Math.floor(Math.random() * locations.length)];

        const minReward = config.ECONOMY.SEARCH_MIN_REWARD;
        const maxReward = config.ECONOMY.SEARCH_MAX_REWARD;
        const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

        let { total, bonus: bonusAmount, cap } = calculateReward(baseReward, message.author.id);

        // Job Bonus: Hacker Data Mine (15% chance for 2x if having Laptop/Superyacht)
        let dataMineMsg = '';
        if (user.job === 'hacker' && (hasActiveItem(message.author.id, 212) || hasActiveItem(message.author.id, 220)) && Math.random() < 0.15) {
            total *= 2;
            bonusAmount *= 2;
            dataMineMsg = t('search.data_mine', lang);
        }

        // Hacker Interaction: Data Breach (5% chance +200-500 flat)
        let dataBreachMsg = '';
        if (user.job === 'hacker' && Math.random() < 0.05) {
            const extra = Math.floor(Math.random() * 301) + 200;
            total += extra;
            dataBreachMsg = t('search.data_breach', lang, { amount: extra });
        }

        // Job Bonus: Trader Market Tip (+50 flat)
        let marketTipMsg = '';
        if (user.job === 'trader') {
            total += 50;
            marketTipMsg = t('search.market_tip', lang);
        }

        db.addBalance(message.author.id, total);



        let msg = t('search.success', lang, {
            location: location,
            amount: total.toLocaleString(),
            emoji: config.EMOJIS.COIN
        });

        if (bonusAmount > 0) {
            msg += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), cap });
        }
        if (dataMineMsg) msg += dataMineMsg;
        if (dataBreachMsg) msg += dataBreachMsg;
        if (marketTipMsg) msg += marketTipMsg;

        return message.reply(msg);
    }
};
