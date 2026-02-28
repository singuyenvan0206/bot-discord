const db = require('../../database');
const { getLevelMultiplier } = require('../../utils/leveling');
const { getUserMultiplier, getTotalIncomeMultiplier, calculateReward, hasActiveItem } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'beg',
    aliases: ['bg'],
    description: 'Xin tiền (Beg for money)',
    cooldown: config.ECONOMY.BEG_COOLDOWN,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        const cooldown = db.getGuildSetting(message.guild.id, 'beg_cooldown', config.ECONOMY.BEG_COOLDOWN);
        const lastBeg = Number(user.last_beg || 0);

        if (now - lastBeg < cooldown) {
            const timeLeft = cooldown - (now - lastBeg);
            const { formatDuration } = require('../../utils/time');
            return message.reply(t('beg.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        db.updateUser(message.guild.id, message.author.id, { last_beg: now });

        const successRate = db.getGuildSetting(message.guild.id, 'beg_rate', config.ECONOMY.BEG_SUCCESS_RATE);
        if (Math.random() < successRate) {
            const minReward = db.getGuildSetting(message.guild.id, 'beg_min', config.ECONOMY.BEG_MIN_REWARD);
            const maxReward = db.getGuildSetting(message.guild.id, 'beg_max', config.ECONOMY.BEG_MAX_REWARD);
            const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            const { total, bonus, percent } = calculateReward(baseReward, message.member, 'daily');

            db.addBalance(message.guild.id, message.author.id, total);

            const persons = t('beg.persons', lang);
            const person = persons[Math.floor(Math.random() * persons.length)];

            let msg = t('beg.success', lang, {
                person: person,
                amount: total.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonus > 0) {
                msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
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
