const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
    name: 'coinflip',
    aliases: ['flip', 'cf'],
    description: 'Flip a coin',
    cooldown: 30,
    async execute(message, args) {
        const call = args[0]?.toLowerCase();

        if (!['heads', 'tails'].includes(call)) {
            return message.reply(`${config.EMOJIS.ERROR} Please specify **heads** or **tails**! Usage: \`${config.PREFIX}coinflip <heads/tails> [bet]\``);
        }

        const user = db.getUser(message.author.id);
        const { parseAmount } = require('../../utils/economy');
        let bet = args[1] ? parseAmount(args[1], user.balance) : 50;

        if (isNaN(bet) || bet <= 0) return message.reply(`${config.EMOJIS.ERROR} Invalid bet amount.`);
        if (user.balance < bet) return message.reply(`${config.EMOJIS.ERROR} You don't have enough money! Balance: **${user.balance}**`);
        if (bet > config.ECONOMY.MAX_BET) return message.reply(`${config.EMOJIS.ERROR} The maximum bet is **${config.ECONOMY.MAX_BET.toLocaleString()}** coins!`);

        db.removeBalance(user.id, bet);

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = call === result;
        const prize = bet * 2;

        if (won) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(user.id, 'gamble');
            const bonus = Math.floor(bet * multiplier);
            const totalEarnings = prize + bonus;
            db.addBalance(user.id, totalEarnings);

            const embed = new EmbedBuilder()
                .setTitle('🪙  Coinflip')
                .setDescription(`You picked **${call}**...\nThe coin shows **${result}**!`)
                .addFields(
                    { name: 'Result', value: `🎉 **You Won!**`, inline: true },
                    { name: 'Base Win', value: `${config.EMOJIS.COIN} +${bet}`, inline: true },
                    { name: 'Item Bonus', value: `✨ +${bonus} (${Math.round(multiplier * 100)}%)`, inline: true },
                    { name: 'Total Return', value: `${config.EMOJIS.COIN} **${totalEarnings}** coins`, inline: false }
                )
                .setColor(config.COLORS.GAMBLE_WIN);

            return message.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('🪙  Coinflip')
                .setDescription(`You picked **${call}**...\nThe coin shows **${result}**!`)
                .addFields(
                    { name: 'Result', value: `${config.EMOJIS.ERROR} **You Lost!**`, inline: true },
                    { name: 'Earnings', value: `💸 -${bet}`, inline: true }
                )
                .setColor(config.COLORS.GAMBLE_LOSS);

            return message.reply({ embeds: [embed] });
        }
    }
};
