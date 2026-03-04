const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { calculateReward } = require('../../utils/multiplier');

const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'hangman',
    aliases: ['hang', 'hm'],
    description: 'Người treo cổ (Play Hangman game)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        let word, hint;

        try {
            const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
            const data = await response.json();

            if (data && data.length > 0) {
                word = data[0].toUpperCase();

                try {
                    const defResponse = await fetch(`${config.API_URLS.DICTIONARY}${word}`);
                    const defData = await defResponse.json();

                    if (defData && defData.length > 0 && defData[0].meanings && defData[0].meanings.length > 0) {
                        const meaning = defData[0].meanings[0];
                        if (meaning.definitions && meaning.definitions.length > 0) {
                            hint = meaning.definitions[0].definition;
                        }
                    }
                } catch (e) {
                    console.error('Error fetching definition:', e);
                }

                if (!hint) hint = t('hangman.no_definition', lang);
            }
        } catch (error) {
            console.error('Error fetching random word:', error);
        }

        if (!word) {
            return message.reply(`${config.EMOJIS.ERROR} ${t('hangman.fetch_error', lang)}`);
        }

        const guessed = new Set();
        let lives = 6;
        let gameOver = false;

        function getDisplay() {
            return word.split('').map(l => guessed.has(l) ? l : '\\_').join(' ');
        }

        async function calcReward(userMember) {
            const baseReward = config.ECONOMY.HANGMAN_REWARD;
            let { total: totalReward, bonus: bonusAmount, percent } = await calculateReward(baseReward, userMember, 'income', { category: 'minigame' });

            // Teacher Interaction: Knowledge Bonus (+20%)
            const u = await db.getUser(userMember.id, userMember.guild.id);
            if (u.job === 'teacher') {
                totalReward = Math.floor(totalReward * 1.2);
                bonusAmount = Math.floor(bonusAmount * 1.2);
            }

            return { totalReward, bonusAmount, percent };
        }

        const embed = new EmbedBuilder()
            .setTitle(t('hangman.title', lang))
            .setDescription(`${t('hangman.hint', lang)}: ${hint}\n\n${t('hangman.word', lang)}: ${getDisplay()}\n${t('hangman.lives', lang)}: ${'❤️'.repeat(lives)}\n\n${t('hangman.guessed', lang)}: ${Array.from(guessed).join(', ') || t('userinfo.none', lang)}`)
            .setColor(config.COLORS.INFO)
            .setFooter({ text: t('hangman.footer', lang) });

        const msg = await message.reply({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => m.author.id === message.author.id && /^[a-zA-Z]+$/.test(m.content) && !m.author.bot,
            time: 120_000
        });

        collector.on('collect', async m => {
            if (gameOver) return;
            m.delete().catch(() => { });

            const input = m.content.toUpperCase();

            // Full Word Guess
            if (input.length > 1) {
                if (input === word) {
                    gameOver = true;
                    const { totalReward, bonusAmount, percent } = await calcReward(message.member);

                    await db.addBalance(message.guild.id, message.author.id, totalReward);

                    let resultStr = `**${t('hangman.word', lang)}:** ${word}\n\n${config.EMOJIS.SUCCESS} **${t('hangman.win_msg', lang)}** (${t('hangman.word_guess_win', lang)})\n${config.EMOJIS.COIN} **+${totalReward.toLocaleString()} coins!**`;
                    if (bonusAmount > 0) resultStr += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent: percent.toLocaleString() });

                    embed.setDescription(resultStr).setColor(config.COLORS.SUCCESS);
                    collector.stop();
                    await msg.edit({ embeds: [embed] });
                    return;
                } else {
                    lives--;
                }
            } else {
                // Single Letter Guess
                if (guessed.has(input)) return;
                guessed.add(input);
                if (!word.includes(input)) lives--;
            }

            const currentDisplay = getDisplay();
            const won = !currentDisplay.includes('\\_');
            const lost = lives <= 0;

            if (gameOver) return;

            if (won || lost) {
                gameOver = true;
                let resultText = won ? `${config.EMOJIS.SUCCESS} **${t('hangman.win_msg', lang)}**` : `💀 **${t('hangman.lose_msg', lang)}**`;
                if (won) {
                    const { totalReward, bonusAmount, percent } = await calcReward(message.member);
                    await db.addBalance(message.guild.id, message.author.id, totalReward);

                    // Grant Win XP
                    const { addXp, XP_AMOUNTS, sendLevelUpMessage } = require('../../utils/leveling');
                    const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                    const result = await addXp(message.member, winXp, message.guild.id);
                    if (result.leveledUp) {
                        sendLevelUpMessage(message, result, lang).catch(() => { });
                    }

                    resultText += `\n${config.EMOJIS.COIN} **+${totalReward.toLocaleString()}** coins!`;
                    if (bonusAmount > 0) resultText += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent: percent.toLocaleString() });
                }
                embed.setDescription(`**${t('hangman.word', lang)}:** ${word}\n\n${resultText}`)
                    .setColor(won ? config.COLORS.SUCCESS : config.COLORS.ERROR);
                collector.stop();
            } else {
                // Grant Action XP for guessing correctly/wrongly but game continues
                const { addXp, XP_AMOUNTS, sendLevelUpMessage } = require('../../utils/leveling');
                const actionResult = await addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);
                if (actionResult.leveledUp) {
                    sendLevelUpMessage(message, actionResult, lang).catch(() => { });
                }

                embed.setDescription(`${t('hangman.hint', lang)}: ${hint}\n\n${t('hangman.word', lang)}: ${currentDisplay}\n${t('hangman.lives', lang)}: ${'❤️'.repeat(lives)}\n\n${t('hangman.guessed', lang)}: ${Array.from(guessed).join(', ') || t('userinfo.none', lang)}`);
            }

            await msg.edit({ embeds: [embed] });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !gameOver) {
                embed.setDescription(`${config.EMOJIS.TIMER} **${t('wordchain.timeout', lang)}** ${t('hangman.word', lang)} is **${word}**.`).setColor(config.COLORS.NEUTRAL);
                msg.edit({ embeds: [embed] });
            }
            startCooldown(message.client, 'hangman', message.author.id);
        });
    }
};
