const db = require('../../database');
const { getUserMultiplier } = require('../../utils/multiplier');

module.exports = {
    name: 'work',
    aliases: ['w', 'wk'],
    description: 'Work to earn money',
    async execute(message, args) {
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = 3600; // 1 hour

        if (now - user.last_work < cooldown) {
            const remaining = (user.last_work + cooldown) - now;
            const minutes = Math.floor(remaining / 60);
            return message.reply(`⏳ You need to rest! Work again in **${minutes}m**.`);
        }

        const jobs = ['Programmer', 'Builder', 'Waiter', 'Chef', 'Mechanic', 'Doctor', 'Artist'];
        const job = jobs[Math.floor(Math.random() * jobs.length)];

        // Base: 100 - 300
        const baseEarnings = Math.floor(Math.random() * 200) + 100;

        const multiplier = getUserMultiplier(message.author.id, 'income');
        const bonus = Math.floor(baseEarnings * multiplier);
        const total = baseEarnings + bonus;

        db.updateUser(message.author.id, { last_work: now });
        db.addBalance(message.author.id, total);

        let msg = `🔨 You worked as a **${job}** and earned **${baseEarnings}** coins! 💰`;
        if (bonus > 0) {
            msg += `\n✨ **Item Bonus:** +${bonus} coins (${Math.round(multiplier * 100)}%)!`;
        }

        return message.reply(msg);
    }
};
