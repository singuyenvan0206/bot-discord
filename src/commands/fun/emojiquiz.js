const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { calculateReward } = require('../../utils/multiplier');
const { getRandomQuestion } = require('../../utils/quizGenerator');

module.exports = {
    name: 'emojiquiz',
    aliases: ['quiz', 'eq'],
    description: 'Đuổi hình bắt chữ qua emoji (Guess the phrase from emojis)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const q = getRandomQuestion();
        if (!q) return message.reply(t('emojiquiz.pool_empty', lang));
        const displayAnswer = q.answers[0].replace(/\b\w/g, c => c.toUpperCase()); // Title Case

        // Generate Hint: Match words and replace non-first letters with underscores
        const hint = displayAnswer.replace(/[a-zA-Z0-9]/g, (char, index) => {
            if (index === 0 || displayAnswer[index - 1] === ' ') return char;
            return '\\_';
        });

        const embed = new EmbedBuilder()
            .setTitle(t('emojiquiz.title', lang))
            .setDescription(`**${q.category}** — ${t('emojiquiz.question', lang, { emojis: `\n\n# ${q.emojis}` })}\n\n💡 **Hint:** \`${hint}\``)
            .setColor(0xE67E22)
            .setFooter({ text: t('emojiquiz.footer', lang) });

        await message.reply({ embeds: [embed] });

        // Grant Action XP
        const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
        await addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => m.author.id === message.author.id && !m.author.bot && q.answers.some(a =>
                    m.content.toLowerCase().trim() === a.toLowerCase() ||
                    m.content.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '') === a.toLowerCase().replace(/[^a-z0-9\s]/g, '')
                ),
                max: 1,
                time: 30_000,
                errors: ['time']
            });

            const winnerMsg = collected.first();
            const baseReward = config.ECONOMY.EMOJIQUIZ_REWARD || 50;
            const { total: totalReward, bonus: bonusAmount, percent } = await calculateReward(baseReward, winnerMsg.member);


            await db.addBalance(message.guild.id, winnerMsg.author.id, totalReward);

            // Grant XP
            const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
            let winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;

            // Teacher Interaction: Tutoring Bonus (+50% coins, +10 XP)
            const u = await db.getUser(winnerMsg.author.id, message.guild.id);
            if (u.job === 'teacher') {
                totalReward = Math.floor(totalReward * 1.5);
                winXp += 10;
            }

            await addXp(winnerMsg.member, winXp, message.guild.id);

            let resultDesc = t('emojiquiz.correct', lang, { answer: displayAnswer, winner: winnerMsg.author.toString() }) +
                t('emojiquiz.reward', lang, { emoji: config.EMOJIS.COIN, amount: totalReward.toLocaleString() });

            if (bonusAmount > 0) resultDesc += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent });
            if (u.job === 'teacher') resultDesc += t('job.teacher_tutoring_simple', lang);

            await winnerMsg.reply({
                embeds: [new EmbedBuilder()
                    .setTitle(t('common.success', lang))
                    .setDescription(resultDesc)
                    .setColor(config.COLORS.SUCCESS)]
            });
            startCooldown(message.client, 'emojiquiz', message.author.id);
        } catch {
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(t('emojiquiz.incorrect', lang).replace('✅', '⌛')) // Reusing or just using text
                    .setDescription(t('emojiquiz.timeout', lang, { answer: displayAnswer }))
                    .setColor(config.COLORS.ERROR)]
            });
            startCooldown(message.client, 'emojiquiz', message.author.id);
        }
    }
};
