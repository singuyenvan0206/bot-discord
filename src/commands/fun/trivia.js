const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');


// Helper function to decode HTML entities
function decodeHtml(html) {
    if (!html) return '';
    return html
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&eacute;/g, 'é')
        .replace(/&oacute;/g, 'ó')
        .replace(/&pound;/g, '£')
        .replace(/&aacute;/g, 'á')
        .replace(/&iacute;/g, 'í')
        .replace(/&ouml;/g, 'ö')
        .replace(/&uuml;/g, 'ü');
}

module.exports = {
    name: 'trivia',
    aliases: ['triv'],
    description: 'Test your knowledge with trivia!',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        let q;
        try {
            // Try fetching from OpenTDB API
            const response = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                q = {
                    q: decodeHtml(result.question),
                    a: decodeHtml(result.correct_answer),
                    w: result.incorrect_answers.map(ans => decodeHtml(ans))
                };
            }
        } catch (error) {
            console.error('Error fetching trivia question from API, trying fallback:', error);
        }

        if (!q) {
            try {
                const localQuestions = require('../../data/trivia_questions.json');
                if (localQuestions && localQuestions.length > 0) {
                    q = localQuestions[Math.floor(Math.random() * localQuestions.length)];
                }
            } catch (err) {
                console.error('Error loading local trivia questions:', err);
            }
        }

        if (!q) {
            return message.reply('❌ Unable to fetch a trivia question at this time. Please try again later.');
        }

        const answers = [q.a, ...q.w].sort(() => Math.random() - 0.5);
        const correctIndex = answers.indexOf(q.a);

        const embed = new EmbedBuilder()
            .setTitle('❓  Trivia Time!')
            .setDescription(q.q)
            .setColor('#FFD700')
            .addFields(
                { name: 'Options', value: answers.map((a, i) => `${['🇦', '🇧', '🇨', '🇩'][i]} ${a}`).join('\n') }
            )
            .setFooter({ text: 'You have 15 seconds to answer!' });

        const row = new ActionRowBuilder()
            .addComponents(
                answers.map((_, i) =>
                    new ButtonBuilder()
                        .setCustomId(`trivia_${i}`)
                        .setLabel(['A', 'B', 'C', 'D'][i])
                        .setStyle(ButtonStyle.Primary)
                )
            );

        const sentMsg = await message.reply({ embeds: [embed], components: [row] });

        const collector = sentMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15000
        });

        const answered = new Set();

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: '❌ This isn\'t your trivia game!', ephemeral: true });
            }

            if (answered.has(i.user.id)) return;
            answered.add(i.user.id);

            const selectedIndex = parseInt(i.customId.split('_')[1]);

            if (selectedIndex === correctIndex) {
                await i.update({ content: `✅ **Correct!** The answer was **${q.a}**.`, components: [], embeds: [] });
            } else {
                await i.update({ content: `❌ **Wrong!** The correct answer was **${q.a}**.`, components: [], embeds: [] });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                try {
                    await sentMsg.edit({ content: `⏰ Time's up! The correct answer was **${q.a}**.`, components: [], embeds: [] });
                } catch (e) { }
            }
            startCooldown(message.client, 'trivia', message.author.id);
        });
    },

};
