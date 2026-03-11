const db = require('../../database');
const { getUserMultiplier, getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');
const { getLevelMultiplier } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

const { formatRewardMessage } = require('../../utils/formatter');

module.exports = {
    name: 'daily',
    aliases: ['dy', 'd'],
    description: 'Nhận quà tặng coins miễn phí hàng ngày (Claim your free daily coin reward)',
    cooldown: config.ECONOMY.DAILY_COOLDOWN,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const now = Math.floor(Date.now() / 1000);

        const baseReward = await db.getGuildSetting(message.guild.id, 'daily_reward', config.ECONOMY.DAILY_REWARD);
        let rewardData = await calculateReward(baseReward, message.member, 'daily');

        await db.updateUser(message.guild.id, message.author.id, { last_daily: now });
        await db.addBalance(message.guild.id, message.author.id, rewardData.total);

        return message.reply(formatRewardMessage('daily.success', lang, rewardData));
    }
};
