const db = require('../../database');
const { getUserMultiplier } = require('../../utils/multiplier');
const { addXp, getLevelMultiplier } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'daily',
    aliases: ['dy', 'day'],
    description: 'Nhận phần thưởng điểm danh hàng ngày',
    cooldown: 5,
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
        const itemMultiplier = getUserMultiplier(message.author.id, 'daily');
        const levelMultiplier = getLevelMultiplier(user.level);

        const itemBonus = Math.floor(baseReward * itemMultiplier);
        const levelBonus = Math.floor(baseReward * levelMultiplier);

        const total = baseReward + itemBonus + levelBonus;

        // Add 50 XP for claiming daily
        addXp(message.author.id, 50);

        db.updateUser(message.author.id, { last_daily: now });
        db.addBalance(message.author.id, total);

        let msg = t('daily.success', lang, { amount: baseReward.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (itemBonus > 0) {
            msg += t('daily.bonus', lang, { amount: itemBonus.toLocaleString(), percent: Math.round(itemMultiplier * 100) });
        }
        if (levelBonus > 0) {
            msg += t('daily.level_bonus', lang, { amount: levelBonus.toLocaleString(), percent: Math.round(levelMultiplier * 100) });
        }

        return message.reply(msg);
    }
};
