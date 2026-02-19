const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'coinflip',
    aliases: ['flip', 'cf'],
    description: 'Flip a coin',
    cooldown: 30,
    async execute(message, args) {
        const call = args[0]?.toLowerCase();

        if (!['heads', 'tails'].includes(call)) {
            return message.reply('❌ Please specify **heads** or **tails**! Usage: `!coinflip <heads/tails> [bet]`');
        }

        const user = db.getUser(message.author.id);

        // Default bet logic
        let bet = parseInt(args[1]);
        if (!args[1]) bet = 50; // Default if no arg provided

        if (isNaN(bet) || bet <= 0) return message.reply('❌ Invalid bet amount.');
        if (user.balance < bet) return message.reply(`❌ You don't have enough money! Balance: **${user.balance}**`);

        db.removeBalance(user.id, bet);

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = call === result;
        const prize = bet * 2;

        if (won) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(user.id, 'gamble');
            const bonus = Math.floor(prize * multiplier);
            db.addBalance(user.id, prize + bonus);

            if (bonus > 0) {
                // We need to inject this into the embed, but let's just add it to the balance and show it in the field
                prize += bonus; // Visual update for next lines
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🪙  Coinflip')
            .setDescription(`You picked **${call}**...\nThe coin shows **${result}**!`)
            .addFields(
                { name: 'Result', value: won ? '🎉 **You Won!**' : '❌ **You Lost!**', inline: true },
                { name: 'Earnings', value: won ? `💰 +${prize + (Math.floor(prize * require('../../utils/multiplier').getUserMultiplier(user.id, 'gamble')))}` : `💸 -${bet}`, inline: true }
            )
            .setColor(won ? 0x2ECC71 : 0xE74C3C);

        if (won) {
            const multiplier = require('../../utils/multiplier').getUserMultiplier(user.id, 'gamble');
            if (multiplier > 0) {
                embed.setDescription(embed.data.description + `\n✨ **Bonus:** +${Math.round(multiplier * 100)}% from items!`);
            }
        }

        return message.reply({ embeds: [embed] });
    }
};
