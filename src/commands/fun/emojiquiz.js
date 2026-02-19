const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

const EMOJI_QUIZ = [
    { emojis: '🦁👑', answer: 'The Lion King' },
    { emojis: '⚡🧙‍♂️👓', answer: 'Harry Potter' },
    { emojis: '🦇👨', answer: 'Batman' },
    { emojis: '🕸️🕷️👨', answer: 'Spider-Man' },
    { emojis: '🚢🧊💔', answer: 'Titanic' },
    { emojis: '🦖🦕🏞️', answer: 'Jurassic Park' },
    { emojis: '👽🚲🌕', answer: 'E.T.' },
    { emojis: '👻🚫👨‍🚒', answer: 'Ghostbusters' },
    { emojis: '🔍🐠', answer: 'Finding Nemo' },
    { emojis: '🐼🥋', answer: 'Kung Fu Panda' },
    { emojis: '🍎👸🏰', answer: 'Snow White' },
    { emojis: '🧞‍♂️✨🐒', answer: 'Aladdin' },
    { emojis: '🚀🌌⚔️', answer: 'Star Wars' },
    { emojis: '💍🌋👣', answer: 'Lord of the Rings' },
    { emojis: '🏴‍☠️🦜🚢', answer: 'Pirates of the Caribbean' },
    { emojis: '🤠🧸🚀', answer: 'Toy Story' },
    { emojis: '🍫🏭🎫', answer: 'Charlie and the Chocolate Factory' },
    { emojis: '🤡🎈😱', answer: 'It' },
    { emojis: '🐀👨‍🍳🍲', answer: 'Ratatouille' },
    { emojis: '🧠💭😄', answer: 'Inside Out' }
];

module.exports = {
    name: 'emojiquiz',
    aliases: ['quiz', 'eq'],
    description: 'Guess the phrase from emojis!',
    async execute(message, args) {
        const q = EMOJI_QUIZ[Math.floor(Math.random() * EMOJI_QUIZ.length)];
        const embed = new EmbedBuilder()
            .setTitle('🧩  Emoji Quiz')
            .setDescription(`Guess the movie/phrase:\n\n# ${q.emojis}`)
            .setColor(0xE67E22)
            .setFooter({ text: 'Type the answer exactly!' });

        await message.reply({ embeds: [embed] });

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => m.content.toLowerCase() === q.answer.toLowerCase() && !m.author.bot,
                max: 1,
                time: 15_000,
                errors: ['time']
            });

            const msg = collected.first();
            const reward = 100;

            db.addBalance(msg.author.id, reward);

            await msg.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🎉  Correct!')
                    .setDescription(`The answer was **${q.answer}**.\nWinner: ${msg.author}\nReward: 💰 **${reward}**`)
                    .setColor(0x2ECC71)]
            });
        } catch {
            await message.channel.send(`⏰ Time's up! The answer was **${q.answer}**.`);
        }
    }
};
