const db = require('../../database');
const { getUserMultiplier, getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');
const { getLevelMultiplier } = require('../../utils/leveling');
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

        let { total, bonus: bonusAmount, cap } = calculateReward(config.ECONOMY.DAILY_REWARD, message.author.id);

        // Chef Interaction: Michelin Star (5% chance — daily ×3)
        let eventMsg = '';
        if (user.job === 'chef' && Math.random() < 0.5) {
            total = Math.floor(total * 3);
            eventMsg = t('daily_events.michelin_star', lang);
        }

        // Doctor Interaction: Medical Trial (8% chance +100-300 coins)
        if (user.job === 'doctor' && Math.random() < 0.30) {
            const grant = Math.floor(Math.random() * 201) + 100;
            total += grant;
            eventMsg += t('daily_events.medical_trial', lang, { amount: grant });
        }

        // Streamer Interaction: Subathon (10% chance +25% bonus)
        if (user.job === 'streamer' && Math.random() < 0.1) {
            const subBonus = Math.floor(total * 0.50);
            total += subBonus;
            eventMsg += t('daily_events.subathon', lang, { amount: subBonus });
        }



        db.updateUser(message.author.id, { last_daily: now });
        db.addBalance(message.author.id, total);

        let msg = t('daily.success', lang, { amount: total.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (bonusAmount > 0) {
            msg += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), cap });
        }
        if (eventMsg) msg += eventMsg;

        return message.reply(msg);
    }
};
