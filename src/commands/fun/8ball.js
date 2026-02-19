const { EmbedBuilder } = require('discord.js');

const RESPONSES = [
    'It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes - definitely.',
    'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.',
    'Yes.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.',
    'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.',
    'Don\'t count on it.', 'My reply is no.', 'My sources say no.',
    'Outlook not so good.', 'Very doubtful.'
];

module.exports = {
    name: '8ball',
    aliases: ['8b'],
    description: 'Ask the magic 8-ball',
    cooldown: 30,
    async execute(message, args) {
        const question = args.join(' ');
        if (!question) return message.reply('❌ You need to ask a question!');

        const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        const embed = new EmbedBuilder()
            .setTitle('🎱  Magic 8-Ball')
            .addFields(
                { name: 'Question', value: question },
                { name: 'Answer', value: `**${answer}**` }
            )
            .setColor(0x9B59B6);

        return message.reply({ embeds: [embed] });
    }
};
