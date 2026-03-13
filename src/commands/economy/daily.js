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
        const user = await db.getUser(message.author.id, message.guild.id);
        const lastDaily = Number(user.last_daily || 0);
        let streak = Number(user.daily_streak || 0);

        // Streak Logic: 
        // - Within 24-48 hours: Increment
        // - More than 48 hours: Reset to 1 (if claimed before)
        // - First time (lastDaily 0): Set to 1
        const hoursSinceLast = (now - lastDaily) / 3600;

        if (lastDaily === 0 || hoursSinceLast > 48) {
            streak = 1;
        } else if (hoursSinceLast >= 24) {
            streak += 1;
        }

        const baseReward = await db.getGuildSetting(message.guild.id, 'daily_reward', config.ECONOMY.DAILY_REWARD);
        const streakBonus = Math.min((streak - 1) * config.ECONOMY.DAILY_STREAK_BONUS, config.ECONOMY.MAX_DAILY_STREAK_BONUS);
        
        let rewardData = await calculateReward(baseReward + streakBonus, message.member, 'daily');

        await db.updateUser(message.guild.id, message.author.id, { 
            last_daily: now,
            daily_streak: streak
        });
        await db.addBalance(message.guild.id, message.author.id, rewardData.total);

        let streakMsg = '';
        if (streak > 1) {
            streakMsg = `\n🔥 **Streak:** \`${streak}\` ngày (+${streakBonus.toLocaleString()} bonus)`;
        } else {
            streakMsg = `\n📅 **Streak:** \`1\` ngày (Bắt đầu chuỗi mới)`;
        }

        const response = formatRewardMessage('daily.success', lang, rewardData);
        if (typeof response === 'string') {
            return message.reply(response + streakMsg);
        } else {
            response.content = (response.content || '') + streakMsg;
            return message.reply(response);
        }

    }
};
