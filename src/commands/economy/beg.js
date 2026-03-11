const db = require('../../database');
const { calculateReward } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { formatRewardMessage } = require('../../utils/formatter');

module.exports = {
    name: 'beg',
    aliases: ['bg'],
    description: 'Xin tiền (Beg for money)',
    cooldown: config.ECONOMY.BEG_COOLDOWN,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        await db.updateUser(message.guild.id, message.author.id, { last_beg: now });

        const successRate = await db.getGuildSetting(message.guild.id, 'beg_rate', config.ECONOMY.BEG_SUCCESS_RATE);
        const persons = t('beg.persons', lang);
        const person = persons[Math.floor(Math.random() * persons.length)];

        if (Math.random() < successRate) {
            const minReward = await db.getGuildSetting(message.guild.id, 'beg_min', config.ECONOMY.BEG_MIN_REWARD);
            const maxReward = await db.getGuildSetting(message.guild.id, 'beg_max', config.ECONOMY.BEG_MAX_REWARD);
            const baseReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            const rewardData = await calculateReward(baseReward, message.member, 'income');
            await db.addBalance(message.guild.id, message.author.id, rewardData.total);

            return message.reply(formatRewardMessage('beg.success', lang, { ...rewardData, person }));
        } else {
            const failMsgs = t('beg.fail_messages', lang);
            const failMsg = failMsgs[Math.floor(Math.random() * failMsgs.length)];

            return message.reply(`${person}: "${failMsg}"`);
        }
    }
};
