const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'guess',
    aliases: ['gn'],
    description: 'Guess the number (1-100)',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const number = Math.floor(Math.random() * 100) + 1;
        let attempts = 0;

        const embed = new EmbedBuilder()
            .setTitle('🔢  Guess the Number')
            .setDescription(`I'm thinking of a number between **1 and 100**.\nYou have **1 minute** to guess it!`)
            .setColor(config.COLORS.INFO);

        await message.reply({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot && !isNaN(parseInt(m.content)),
            time: 60_000
        });

        collector.on('collect', m => {
            const guess = parseInt(m.content);
            attempts++;

            if (guess === number) {
                const reward = Math.max(10, config.ECONOMY.GUESS_REWARD_BASE - (attempts * 5));
                db.addBalance(m.author.id, reward);

                m.reply(`${config.EMOJIS.SUCCESS} **Correct!** The number was **${number}**.\nYou guessed it in **${attempts}** attempts and won ${config.EMOJIS.COIN} **${reward}** coins!`);
                collector.stop();
            } else if (guess < number) {
                m.react('⬆️'); // Higher
            } else {
                m.react('⬇️'); // Lower
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                message.channel.send(`${config.EMOJIS.TIMER} **Time's up!** The number was **${number}**.`);
            }
            startCooldown(message.client, 'guess', message.author.id);
        });
    }
};
