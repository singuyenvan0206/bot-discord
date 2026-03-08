const db = require('../../database');
const { getUserMultiplier, getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');
const { getLevelMultiplier } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'daily',
    aliases: ['dy', 'd'],
    description: 'Nhận quà tặng coins miễn phí hàng ngày (Claim your free daily coin reward)',
    cooldown: config.ECONOMY.DAILY_COOLDOWN,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        const user = await db.getUser(message.author.id, message.guild.id);
        const cooldown = await db.getGuildSetting(message.guild.id, 'daily_cooldown', config.ECONOMY.DAILY_COOLDOWN);
        const lastDaily = Number(user.last_daily || 0);
        const now = Math.floor(Date.now() / 1000);

        if (now - lastDaily < cooldown) {
            const timeLeft = cooldown - (now - lastDaily);
            const { formatDuration } = require('../../utils/time');
            return message.reply(t('daily.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const baseReward = await db.getGuildSetting(message.guild.id, 'daily_reward', config.ECONOMY.DAILY_REWARD);
        let { total, bonus, percent } = await calculateReward(baseReward, message.member, 'daily');

        await db.updateUser(message.guild.id, message.author.id, { last_daily: now });
        await db.addBalance(message.guild.id, message.author.id, total);

        let msg = t('daily.success', lang, { amount: total.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (bonus > 0) {
            msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
        }

        return message.reply(msg);
    }
};
