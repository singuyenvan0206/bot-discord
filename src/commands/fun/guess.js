const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'guess',
    aliases: ['gn'],
    description: 'Guess the number (1-100)',
    cooldown: 30,
    async execute(message, args) {
        const number = Math.floor(Math.random() * 100) + 1;
        let attempts = 0;

        const embed = new EmbedBuilder()
            .setTitle('🔢  Guess the Number')
            .setDescription('I\'m thinking of a number between **1 and 100**.\nYou have **1 minute** to guess it!')
            .setColor(0x3498DB);

        await message.reply({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot && !isNaN(parseInt(m.content)),
            time: 60_000
        });

        collector.on('collect', m => {
            const guess = parseInt(m.content);
            attempts++;

            if (guess === number) {
                const reward = Math.max(10, 100 - (attempts * 5));
                db.addBalance(m.author.id, reward);

                m.reply(`🎉 **Correct!** The number was **${number}**.\nYou guessed it in **${attempts}** attempts and won 💰 **${reward}** coins!`);
                collector.stop();
            } else if (guess < number) {
                m.react('⬆️'); // Higher
            } else {
                m.react('⬇️'); // Lower
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                message.channel.send(`⏰ **Time's up!** The number was **${number}**.`);
            }
        });
    }
};
