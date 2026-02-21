const db = require('../../database');
const { getUserMultiplier } = require('../../utils/multiplier');
const { addXp, getLevelMultiplier } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'work',
    aliases: ['w', 'wk'],
    description: 'Làm việc để kiếm tiền',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.WORK_COOLDOWN;

        if (now - user.last_work < cooldown) {
            const remaining = (user.last_work + cooldown) - now;
            const minutes = Math.floor(remaining / 60);
            return message.reply(t('work.cooldown', lang, { minutes }));
        }

        const jobs = t('work.jobs', lang);
        const job = jobs[Math.floor(Math.random() * jobs.length)];

        // Base earnings from config
        const minEarnings = config.ECONOMY.MIN_WORK_EARNINGS;
        const maxEarnings = config.ECONOMY.MAX_WORK_EARNINGS;
        const baseEarnings = Math.floor(Math.random() * (maxEarnings - minEarnings + 1)) + minEarnings;

        const itemMultiplier = getUserMultiplier(message.author.id, 'income');
        const levelMultiplier = getLevelMultiplier(user.level);

        const itemBonus = Math.floor(baseEarnings * itemMultiplier);
        const levelBonus = Math.floor(baseEarnings * levelMultiplier);

        const total = baseEarnings + itemBonus + levelBonus;

        // Add random XP between 15-30 for working
        const xpGained = Math.floor(Math.random() * 16) + 15;
        addXp(message.author.id, xpGained);

        db.updateUser(message.author.id, { last_work: now });
        db.addBalance(message.author.id, total);

        let msg = t('work.success', lang, { job, amount: baseEarnings.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (itemBonus > 0) {
            msg += t('work.bonus', lang, { amount: itemBonus.toLocaleString(), percent: Math.round(itemMultiplier * 100) });
        }
        if (levelBonus > 0) {
            msg += t('work.level_bonus', lang, { amount: levelBonus.toLocaleString(), percent: Math.round(levelMultiplier * 100) });
        }

        return message.reply(msg);
    }
};
