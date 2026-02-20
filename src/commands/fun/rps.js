const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'rps',
    aliases: ['rock'],
    description: 'Rock Paper Scissors',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const choices = ['rock', 'paper', 'scissors'];
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

        const { parseAmount } = require('../../utils/economy');
        const user = db.getUser(message.author.id);

        let userChoice = args[0]?.toLowerCase();
        let bet = 0;

        // Check if first arg is a bet amount
        if (args[0] && !choices.includes(userChoice)) {
            bet = parseAmount(args[0], user.balance);
            userChoice = null; // No choice made yet
        } else if (args[1]) {
            bet = parseAmount(args[1], user.balance);
        }

        // Default Bet if none provided
        if (bet === 0 && (!args[0] || (choices.includes(userChoice) && !args[1]))) {
            bet = 50;
        }

        // Validate Bet
        if (bet > 0) {
            if (user.balance < bet) return message.reply(`${config.EMOJIS.ERROR} You don't have enough money! Balance: **${user.balance}**`);
            if (bet > config.ECONOMY.MAX_BET) return message.reply(`${config.EMOJIS.ERROR} The maximum bet is **${config.ECONOMY.MAX_BET.toLocaleString()}** coins!`);
            db.removeBalance(user.id, bet);
        } else if (bet < 0) {
            return message.reply(`${config.EMOJIS.ERROR} Invalid bet amount.`);
        }

        if (!userChoice || !choices.includes(userChoice)) {
            // Interactive mode
            const uid = Date.now().toString(36);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rps_rock_${uid}`).setLabel('Rock').setEmoji('🪨').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rps_paper_${uid}`).setLabel('Paper').setEmoji('📄').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rps_scissors_${uid}`).setLabel('Scissors').setEmoji('✂️').setStyle(ButtonStyle.Primary)
            );

            const embed = new EmbedBuilder()
                .setTitle('Rock Paper Scissors')
                .setDescription(bet > 0 ? `**Betting: ${bet} coins**\nChoose your weapon!` : 'Choose your weapon!')
                .setColor(config.COLORS.WARNING);

            const reply = await message.reply({ embeds: [embed], components: [row] });

            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30_000,
                filter: i => i.user.id === message.author.id && i.customId.endsWith(uid),
                max: 1
            });

            collector.on('collect', async i => {
                const choice = i.customId.split('_')[1];
                await playRPS(i, choice, null, reply, bet);
                startCooldown(message.client, 'rps', message.author.id);
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    // Refund if timed out
                    if (bet > 0) db.addBalance(user.id, bet);
                    reply.edit({ content: `${config.EMOJIS.TIMER} Timed out! Bet refunded.`, components: [] }).catch(() => { });
                }
            });
            return;
        }

        // Command mode
        await playRPS(null, userChoice, message, null, bet);
        startCooldown(message.client, 'rps', message.author.id);

        async function playRPS(interaction, uChoice, msgObj, replyObj, betAmount) {
            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            let result;
            let outcome = 'lose'; // win, lose, tie

            if (uChoice === botChoice) {
                result = "It's a tie! 🤝";
                outcome = 'tie';
            }
            else if (
                (uChoice === 'rock' && botChoice === 'scissors') ||
                (uChoice === 'paper' && botChoice === 'rock') ||
                (uChoice === 'scissors' && botChoice === 'paper')
            ) {
                result = "You win! 🎉";
                outcome = 'win';
            }
            else {
                result = "I win! 😈";
                outcome = 'lose';
            }

            // Payout Handling
            if (betAmount > 0) {
                if (outcome === 'win') {
                    let prize = betAmount * 2;
                    const { getUserMultiplier } = require('../../utils/multiplier');
                    const multiplier = getUserMultiplier(user.id, 'gamble');
                    const bonus = Math.floor(betAmount * multiplier);
                    prize += bonus;

                    db.addBalance(user.id, prize);
                    result += `\n${config.EMOJIS.COIN} **Won ${prize} coins!**`;
                    if (bonus > 0) result += ` *(Includes +${bonus} bonus: ${Math.round(multiplier * 100)}%)*`;
                } else if (outcome === 'tie') {
                    db.addBalance(user.id, betAmount); // Refund
                    result += `\n🤝 **Bet refunded.**`;
                } else {
                    result += `\n💸 **Lost ${betAmount} coins.**`;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('Rock Paper Scissors')
                .setDescription(`You chose: ${emojis[uChoice]}\nI chose: ${emojis[botChoice]}\n\n**${result}**`)
                .setColor(outcome === 'win' ? config.COLORS.GAMBLE_WIN : outcome === 'tie' ? config.COLORS.GAMBLE_PUSH : config.COLORS.GAMBLE_LOSS);

            if (interaction) {
                await interaction.update({ embeds: [embed], components: [] });
            } else {
                await msgObj.reply({ embeds: [embed] });
            }
        }
    }
};
