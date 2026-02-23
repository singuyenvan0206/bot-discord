const db = require('../../database');
const { getUserMultiplier, getTotalIncomeMultiplier, getXpMultiplier } = require('../../utils/multiplier');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'daily',
    aliases: ['dy', 'day'],
    description: 'Nhận phần thưởng điểm danh hàng ngày',
    cooldown: config.ECONOMY.DAILY_COOLDOWN,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.DAILY_COOLDOWN;

        if (now - user.last_daily < cooldown) {
            const remaining = (user.last_daily + cooldown) - now;
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            return message.reply(t('daily.cooldown', lang, { hours, minutes }));
        }

        const baseReward = config.ECONOMY.DAILY_REWARD;
        const totalMulti = getTotalIncomeMultiplier(message.author.id);
        const bonusAmount = Math.floor(baseReward * totalMulti);

        let total = baseReward + bonusAmount;

        // Chef Interaction: Michelin Star (5% chance — daily ×3)
        let michelinMsg = '';
        if (user.job === 'chef' && Math.random() < 0.05) {
            total = Math.floor(total * 3);
            michelinMsg = t('daily_events.michelin_star', lang);
        }

        // Add 50 XP for claiming daily (with teacher multiplier)
        const xpMulti = getXpMultiplier(message.author.id);
        const xpResult = addXp(message.author.id, Math.floor(50 * xpMulti));

        db.updateUser(message.author.id, { last_daily: now });
        db.addBalance(message.author.id, total);

        let msg = t('daily.success', lang, { amount: total.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (bonusAmount > 0) {
            msg += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 200%)' : 'Includes 🎁 Bonus (Capped 200%)'}: +${bonusAmount.toLocaleString()} coins)*`;
        }
        if (michelinMsg) msg += michelinMsg;

        await message.reply(msg);
        return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
    }
};
