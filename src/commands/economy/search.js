const db = require('../../database');
const { calculateReward } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { formatRewardMessage } = require('../../utils/formatter');
const { handleSearchJobInteractions } = require('../../utils/jobInteractions');

module.exports = {
    name: 'search',
    aliases: ['sc', 'find'],
    description: 'Tìm kiếm (Search for coins)',
    cooldown: config.ECONOMY.SEARCH_COOLDOWN,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        await db.updateUser(message.guild.id, message.author.id, { last_search: now });

        const locations = t('search.locations', lang);
        if (!Array.isArray(locations) || locations.length === 0) {
            return message.reply(`❌ ${t('common.error', lang)} (Missing locations)`);
        }
        const location = locations[Math.floor(Math.random() * locations.length)];

        const minReward = await db.getGuildSetting(message.guild.id, 'search_min', config.ECONOMY.SEARCH_MIN_REWARD);
        const maxReward = await db.getGuildSetting(message.guild.id, 'search_max', config.ECONOMY.SEARCH_MAX_REWARD);
        let reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

        let rewardData = await calculateReward(reward, message.member, 'income', { category: 'search' });
        const jobMsg = handleSearchJobInteractions(user, lang, rewardData);

        await db.addBalance(message.guild.id, message.author.id, rewardData.total);

        let msg = formatRewardMessage('search.success', lang, { ...rewardData, location }) + jobMsg;

        return message.reply(msg);
    }
};
