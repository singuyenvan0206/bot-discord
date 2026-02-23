const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { getTotalIncomeMultiplier } = require('../../utils/multiplier');
const { getRandomQuestion } = require('../../utils/quizGenerator');

module.exports = {
    name: 'emojiquiz',
    aliases: ['quiz', 'eq'],
    description: 'Guess the phrase from emojis!',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id);
        const q = getRandomQuestion();
        if (!q) return message.reply('⚠️ Quiz pool is empty. Please try again later.');
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

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => !m.author.bot && q.answers.some(a =>
                    m.content.toLowerCase().trim() === a.toLowerCase() ||
                    m.content.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '') === a.toLowerCase().replace(/[^a-z0-9\s]/g, '')
                ),
                max: 1,
                time: 30_000,
                errors: ['time']
            });

            const winnerMsg = collected.first();
            const baseReward = config.ECONOMY.EMOJIQUIZ_REWARD;
            const totalMulti = getTotalIncomeMultiplier(winnerMsg.author.id);
            const bonusAmount = Math.floor(baseReward * totalMulti);
            const totalReward = baseReward + bonusAmount;

            const { getXpMultiplier } = require('../../utils/multiplier');
            const { addXp } = require('../../utils/leveling');
            const xpMultiplier = getXpMultiplier(winnerMsg.author.id);
            const baseXp = 20; // Base emojiquiz XP
            const totalXp = Math.floor(baseXp * xpMultiplier);

            db.addBalance(winnerMsg.author.id, totalReward);
            addXp(winnerMsg.author.id, totalXp);

            let resultDesc = t('emojiquiz.correct', lang, { answer: displayAnswer, winner: winnerMsg.author.toString() }) +
                t('emojiquiz.reward', lang, { emoji: config.EMOJIS.COIN, amount: totalReward }) +
                ` & ✨ **${totalXp}** XP!`;

            if (bonusAmount > 0) resultDesc += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 200%)' : 'Includes 🎁 Bonus (Capped 200%)'}: +${bonusAmount.toLocaleString()} coins)*`;

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
