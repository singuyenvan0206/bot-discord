const db = require('../../database');
const { getLevelMultiplier } = require('../../utils/leveling');
const { calculateReward, hasActiveItem } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'search',
    aliases: ['sc', 'find'],
    description: 'Tìm kiếm (Search for coins)',
    cooldown: config.ECONOMY.SEARCH_COOLDOWN,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        const cooldown = await db.getGuildSetting(message.guild.id, 'search_cooldown', config.ECONOMY.SEARCH_COOLDOWN);
        const lastSearch = Number(user.last_search || 0);

        if (now - lastSearch < cooldown) {
            const timeLeft = cooldown - (now - lastSearch);
            return message.reply(t('search.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        await db.updateUser(message.guild.id, message.author.id, { last_search: now });

        const locations = t('search.locations', lang);
        if (!Array.isArray(locations) || locations.length === 0) {
            return message.reply(`❌ ${t('common.error', lang)} (Missing locations)`);
        }
        const location = locations[Math.floor(Math.random() * locations.length)];

        const minReward = await db.getGuildSetting(message.guild.id, 'search_min', config.ECONOMY.SEARCH_MIN_REWARD);
        const maxReward = await db.getGuildSetting(message.guild.id, 'search_max', config.ECONOMY.SEARCH_MAX_REWARD);
        const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

        const { total, bonus, percent } = await calculateReward(reward, message.member, 'income', { category: 'search' });

        // Job Bonus: Hacker Data Mine (35% chance for 2x)
        let dataMineMsg = '';
        if (user.job === 'hacker' && Math.random() < 0.35) {
            total *= 2;
            bonus *= 2;
            dataMineMsg = t('search.data_mine', lang);
        }

        // Hacker Interaction: Data Breach (15% chance +2000-5000 flat)
        let dataBreachMsg = '';
        if (user.job === 'hacker' && Math.random() < 0.15) {
            const extra = Math.floor(Math.random() * 3001) + 2000;
            total += extra;
            dataBreachMsg = t('search.data_breach', lang, { amount: extra.toLocaleString() });
        }

        // Job Bonus: Trader Market Tip (+1200 flat)
        let marketTipMsg = '';
        if (user.job === 'trader') {
            total += 1200;
            marketTipMsg = t('search.market_tip', lang);
        }

        await db.addBalance(message.guild.id, message.author.id, total);

        let msg = t('search.success', lang, {
            location: location,
            amount: total.toLocaleString(),
            emoji: config.EMOJIS.COIN
        });

        if (bonus > 0) {
            msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
        }
        if (dataMineMsg) msg += dataMineMsg;
        if (dataBreachMsg) msg += dataBreachMsg;
        if (marketTipMsg) msg += marketTipMsg;

        return message.reply(msg);
    }
};
