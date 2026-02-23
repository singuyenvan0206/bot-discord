const db = require('../../database');
const { getLevelMultiplier } = require('../../utils/leveling');
const { getUserMultiplier, getTotalIncomeMultiplier, calculateReward, hasActiveItem } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'beg',
    description: 'Xin tiền từ những người lạ tốt bụng',
    cooldown: config.ECONOMY.BEG_COOLDOWN,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.BEG_COOLDOWN;

        if (now - user.last_beg < cooldown) {
            const remaining = (user.last_beg + cooldown) - now;
            const minutes = Math.ceil(remaining / 60);
            return message.reply(t('beg.cooldown', lang, { minutes }));
        }

        db.updateUser(message.author.id, { last_beg: now });

        const isSuccess = Math.random() < config.ECONOMY.BEG_SUCCESS_RATE;

        if (isSuccess) {
            const minReward = config.ECONOMY.BEG_MIN_REWARD;
            const maxReward = config.ECONOMY.BEG_MAX_REWARD;
            const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            const { total, bonus: bonusAmount } = calculateReward(baseReward, message.author.id);

            db.addBalance(message.author.id, total);



            const persons = t('beg.persons', lang);
            const person = persons[Math.floor(Math.random() * persons.length)];

            let msg = t('beg.success', lang, {
                person: person,
                amount: total.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonusAmount > 0) {
                msg += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString() });
            }

            return message.reply(msg);
        } else {
            const persons = t('beg.persons', lang);
            const person = persons[Math.floor(Math.random() * persons.length)];
            const failMsgs = t('beg.fail_messages', lang);
            const failMsg = failMsgs[Math.floor(Math.random() * failMsgs.length)];

            return message.reply(`${person}: "${failMsg}"`);
        }
    }
};
