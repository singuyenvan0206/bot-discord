const db = require('../../database');
const { getUserMultiplier } = require('../../utils/multiplier');
const config = require('../../config');

module.exports = {
    name: 'daily',
    aliases: ['d', 'dy'],
    description: 'Claim your daily reward',
    async execute(message, args) {
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.DAILY_COOLDOWN;

        if (now - user.last_daily < cooldown) {
            const remaining = (user.last_daily + cooldown) - now;
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            return message.reply(`${config.EMOJIS.WAITING} You can claim your daily reward in **${hours}h ${minutes}m**.`);
        }

        const baseReward = config.ECONOMY.DAILY_REWARD;
        const multiplier = getUserMultiplier(message.author.id, 'daily');
        const bonus = Math.floor(baseReward * multiplier);
        const total = baseReward + bonus;

        db.updateUser(message.author.id, { last_daily: now });
        db.addBalance(message.author.id, total);

        let msg = `${config.EMOJIS.SUCCESS} You claimed your daily reward of **${baseReward}** coins! ${config.EMOJIS.COIN}`;
        if (bonus > 0) {
            msg += `\n✨ **Item Bonus:** +${bonus} coins (${Math.round(multiplier * 100)}%)!`;
        }

        return message.reply(msg);
    }
};
