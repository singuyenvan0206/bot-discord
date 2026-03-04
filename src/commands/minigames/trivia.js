const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const { calculateReward } = require('../../utils/multiplier');
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
    aliases: ['triv', 'tv'],
    description: 'Thách thức kiến thức với kho câu hỏi đa dạng (Challenge your knowledge with diverse trivia)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
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
            return message.reply(t('trivia.load_error', lang));
        }

        const answers = [q.a, ...q.w].sort(() => Math.random() - 0.5);
        const correctIndex = answers.indexOf(q.a);

        const embed = new EmbedBuilder()
            .setTitle(t('trivia.title', lang))
            .setDescription(`${q.q}${t('trivia.english_note', lang)}`)
            .setColor('#FFD700')
            .addFields(
                { name: t('trivia.choices', lang), value: answers.map((a, i) => `${['🇦', '🇧', '🇨', '🇩'][i]} ${a}`).join('\n') }
            )
            .setFooter({ text: t('trivia.footer', lang) });

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
                return i.reply({ content: t('trivia.not_your_turn', lang), ephemeral: true });
            }

            if (answered.has(i.user.id)) return;
            answered.add(i.user.id);

            const { addXp, XP_AMOUNTS, sendLevelUpMessage } = require('../../utils/leveling');
            const actionResult = await addXp(i.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);
            if (actionResult.leveledUp) {
                sendLevelUpMessage(i, actionResult, lang).catch(() => { });
            }

            const selectedIndex = parseInt(i.customId.split('_')[1]);

            if (selectedIndex === correctIndex) {
                const baseReward = config.ECONOMY.TRIVIA_REWARD;

                const { total: reward, bonus: bonusAmount, percent } = await calculateReward(baseReward, i.member, 'income', { category: 'minigame' });

                let winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                let teacherBonusApplied = false;

                // Teacher Interaction: Tutoring Bonus (+50% coins, +10 XP)
                const u = await db.getUser(i.user.id, message.guild.id);
                if (u.job === 'teacher') {
                    totalReward = Math.floor(totalReward * 1.5);
                    winXp += 10;
                    teacherBonusApplied = true;
                }

                await db.addBalance(message.guild.id, i.user.id, totalReward);

                let resultMsg = t('trivia.correct', lang, { answer: q.a, emoji: config.EMOJIS.COIN, reward: totalReward.toLocaleString() });
                if (bonusAmount > 0) resultMsg += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent: percent.toLocaleString() });
                if (teacherBonusApplied) resultMsg += t('job.teacher_tutoring_simple', lang);

                const winResult = await addXp(i.member, winXp, message.guild.id);
                if (winResult.leveledUp) {
                    sendLevelUpMessage(i, winResult, lang).catch(() => { });
                }

                await i.update({ content: resultMsg, components: [], embeds: [] });
            } else {
                await i.update({ content: t('trivia.incorrect', lang, { answer: q.a }), components: [], embeds: [] });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                try {
                    await sentMsg.edit({ content: t('trivia.timeout', lang, { answer: q.a }), components: [], embeds: [] });
                } catch (e) { }
            }
            startCooldown(message.client, 'trivia', message.author.id);
        });
    }
};
