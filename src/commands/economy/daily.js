const db = require('../../database');
const { getUserMultiplier } = require('../../utils/multiplier');
const config = require('../../config');

module.exports = {
    name: 'daily',
    aliases: ['d', 'dy'],
    description: 'Nhận phần thưởng hàng ngày của bạn',
    async execute(message, args) {
        const { t, getLanguage } = require('../../utils/i18n');
        const lang = getLanguage(message.author.id, message.guild.id);

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
        const multiplier = getUserMultiplier(message.author.id, 'daily');
        const bonus = Math.floor(baseReward * multiplier);
        const total = baseReward + bonus;

        db.updateUser(message.author.id, { last_daily: now });
        db.addBalance(message.author.id, total);

        let msg = t('daily.success', lang, { amount: baseReward, emoji: config.EMOJIS.COIN });
        if (bonus > 0) {
            msg += t('daily.bonus', lang, { amount: bonus, percent: Math.round(multiplier * 100) });
        }

        return message.reply(msg);
    }
};
