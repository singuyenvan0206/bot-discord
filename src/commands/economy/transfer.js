const db = require('../../database');

module.exports = {
    name: 'transfer',
    aliases: ['pay', 'tf'],
    description: 'Transfer money to another user',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!targetUser) return message.reply('❌ Please mention a user to transfer money to.');
        if (isNaN(amount) || amount <= 0) return message.reply('❌ Please specify a valid amount.');

        const user = db.getUser(message.author.id);

        if (targetUser.id === message.author.id) return message.reply('❌ You cannot transfer money to yourself.');
        if (targetUser.bot) return message.reply('❌ You cannot transfer money to bots.');
        if (user.balance < amount) return message.reply(`❌ You don't have enough money! You only have **${user.balance}** coins.`);

        db.removeBalance(message.author.id, amount);
        db.addBalance(targetUser.id, amount);

        return message.reply(`✅ Successfully transferred **${amount}** coins to ${targetUser}! 💸`);
    }
};
