const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');


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
    description: 'Kiểm tra kiến thức của bạn với trò chơi Đố Vui (Trivia)!',
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
            return message.reply('❌ Hiện không thể tải được câu hỏi đố vui. Vui lòng thử lại sau.');
        }

        const answers = [q.a, ...q.w].sort(() => Math.random() - 0.5);
        const correctIndex = answers.indexOf(q.a);

        const embed = new EmbedBuilder()
            .setTitle('❓  Đố Vui Hại Não (Trivia)!')
            .setDescription(`${q.q}\n\n*(Lưu ý: Hiện tại câu hỏi chỉ hỗ trợ tiếng Anh)*`)
            .setColor('#FFD700')
            .addFields(
                { name: 'Lựa chọn', value: answers.map((a, i) => `${['🇦', '🇧', '🇨', '🇩'][i]} ${a}`).join('\n') }
            )
            .setFooter({ text: 'Bạn có 15 giây để trả lời!' });

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
                return i.reply({ content: '❌ Đây không phải lượt đố vui của bạn!', ephemeral: true });
            }

            if (answered.has(i.user.id)) return;
            answered.add(i.user.id);

            const selectedIndex = parseInt(i.customId.split('_')[1]);

            if (selectedIndex === correctIndex) {
                const baseReward = config.ECONOMY.TRIVIA_REWARD;
                const { getUserMultiplier } = require('../../utils/multiplier');
                const multiplier = getUserMultiplier(i.user.id, 'income');
                const bonus = Math.floor(baseReward * multiplier);
                const totalReward = baseReward + bonus;

                db.addBalance(i.user.id, totalReward);

                let resultMsg = `${config.EMOJIS.SUCCESS} **Chính xác!** Đáp án là **${q.a}**.\nPhần thưởng: ${config.EMOJIS.COIN} **${baseReward}** coins`;
                if (bonus > 0) resultMsg += ` ✨ *(Thưởng item +${bonus})*`;

                await i.update({ content: resultMsg, components: [], embeds: [] });
            } else {
                await i.update({ content: `${config.EMOJIS.ERROR} **Sai rồi!** Đáp án chính xác là **${q.a}**.`, components: [], embeds: [] });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                try {
                    await sentMsg.edit({ content: `${config.EMOJIS.TIMER} **Hết thời gian!** Đáp án chính xác là **${q.a}**.`, components: [], embeds: [] });
                } catch (e) { }
            }
            startCooldown(message.client, 'trivia', message.author.id);
        });
    }

};
