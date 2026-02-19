const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'math',
    description: 'Solve a math problem',
    cooldown: 10,
    async execute(message, args) {
        const ops = ['+', '-', '*'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        const a = Math.floor(Math.random() * 50) + 1;
        const b = Math.floor(Math.random() * 50) + 1;

        let answer;
        if (op === '+') answer = a + b;
        else if (op === '-') answer = a - b;
        else answer = a * b;

        const embed = new EmbedBuilder()
            .setTitle('🧮  Math Quiz')
            .setDescription(`What is **${a} ${op} ${b}**?`)
            .setColor(0xF1C40F)
            .setFooter({ text: 'You have 10 seconds!' });

        await message.reply({ embeds: [embed] });

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => parseInt(m.content) === answer && !m.author.bot,
                max: 1,
                time: 10_000,
                errors: ['time']
            });

            const winner = collected.first();
            const reward = 20;
            db.addBalance(winner.author.id, reward);

            winner.reply(`🎉 **Correct!** The answer was **${answer}**.\nYou won 💰 **${reward}** coins!`);
        } catch {
            message.channel.send(`⏰ **Time's up!** The answer was **${answer}**.`);
        }
    }
};
