const db = require('../../database');
const { getUserMultiplier } = require('../../utils/multiplier');

module.exports = {
    name: 'daily',
    aliases: ['d', 'dy'],
    description: 'Claim your daily reward',
    async execute(message, args) {
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = 86400; // 24 hours

        if (now - user.last_daily < cooldown) {
            const remaining = (user.last_daily + cooldown) - now;
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            return message.reply(`⏳ You can claim your daily reward in **${hours}h ${minutes}m**.`);
        }

        const baseReward = 500;
        const multiplier = getUserMultiplier(message.author.id, 'daily');
        const bonus = Math.floor(baseReward * multiplier);
        const total = baseReward + bonus;

        db.updateUser(message.author.id, { last_daily: now });
        db.addBalance(message.author.id, total);

        let msg = `✅ You claimed your daily reward of **${baseReward}** coins! 💰`;
        if (bonus > 0) {
            msg += `\n✨ **Item Bonus:** +${bonus} coins (${Math.round(multiplier * 100)}%)!`;
        }

        return message.reply(msg);
    }
};
