const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'hangman',
    aliases: ['hang', 'hm'],
    description: 'Chơi Trò Chơi Người Treo Cổ (Hangman)!',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        let word, hint;

        try {
            // Try fetching from Random Word API
            const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
            const data = await response.json();

            if (data && data.length > 0) {
                word = data[0].toUpperCase();

                // Try fetching definition for hint
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

        // If API fails to provide a word
        if (!word) {
            return message.reply(`${config.EMOJIS.ERROR} ${t('hangman.fetch_error', lang)}`);
        }

        const guessed = new Set();
        let lives = 6;
        let gameOver = false;

        function getDisplay() {
            return word.split('').map(l => guessed.has(l) ? l : '\\_').join(' ');
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
                    const { getUserMultiplier, getXpMultiplier } = require('../../utils/multiplier');
                    const { addXp } = require('../../utils/leveling');
                    const userData = db.getUser(message.author.id);
                    const isProgrammer = userData.job === 'programmer';
                    const isTeacher = userData.job === 'teacher';
                    const baseReward = config.ECONOMY.HANGMAN_REWARD;
                    const multiplier = getUserMultiplier(message.author.id, 'income');
                    const bonus = Math.floor(baseReward * multiplier);

                    let jobBonus = 0;
                    if (isProgrammer || isTeacher) {
                        jobBonus = Math.floor(baseReward * 0.20);
                    }

                    const totalReward = baseReward + bonus + jobBonus;

                    const xpMultiplier = getXpMultiplier(message.author.id);
                    const baseXp = 40; // Base hangman XP
                    const totalXp = Math.floor(baseXp * xpMultiplier);

                    db.addBalance(message.author.id, totalReward);
                    addXp(message.author.id, totalXp);

                    let resultStr = `**${t('hangman.word', lang)}:** ${word}\n\n${config.EMOJIS.SUCCESS} **${t('hangman.win_msg', lang)}** (${t('hangman.word_guess_win', lang)})\n${config.EMOJIS.COIN} **+${(baseReward + jobBonus).toLocaleString()} coins & ✨ ${totalXp} XP!**`;
                    if (jobBonus > 0) {
                        const jName = isProgrammer ? t('jobs.programmer.name', lang) : t('jobs.teacher.name', lang);
                        resultStr += `\n✨ **${jName} Bonus:** +${jobBonus.toLocaleString()} coins (20%)`;
                    }
                    if (bonus > 0) resultStr += `\n✨ **${t('fish.item_bonus', lang)}:** +${bonus.toLocaleString()} (${Math.round(multiplier * 100)}%)`;

                    if (jobBonus > 0) {
                        const jName = isProgrammer ? t('jobs.programmer.name', lang) : t('jobs.teacher.name', lang);
                        resultStr += `\n✨ **${jName} Bonus:** +${jobBonus.toLocaleString()} coins (20%)`;
                    }

                    if (bonus > 0) resultStr += `\n✨ **${t('fish.item_bonus', lang)}:** +${bonus.toLocaleString()} (${Math.round(multiplier * 100)}%)`;

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
                    const userData = db.getUser(message.author.id);
                    const isProgrammer = userData.job === 'programmer';
                    const isTeacher = userData.job === 'teacher';
                    const baseReward = config.ECONOMY.HANGMAN_REWARD;
                    const multiplier = getUserMultiplier(message.author.id, 'income');
                    const bonus = Math.floor(baseReward * multiplier);

                    let jobBonus = 0;
                    if (isProgrammer || isTeacher) {
                        jobBonus = Math.floor(baseReward * 0.20);
                    }

                    const totalReward = baseReward + bonus + jobBonus;

                    const xpMultiplier = getXpMultiplier(message.author.id);
                    const baseXp = 40; // Base hangman XP
                    const totalXp = Math.floor(baseXp * xpMultiplier);

                    db.addBalance(message.author.id, totalReward);
                    addXp(message.author.id, totalXp);

                    resultText += `\n${config.EMOJIS.COIN} **+${(baseReward + jobBonus).toLocaleString()}** coins & ✨ **${totalXp}** XP!`;

                    if (jobBonus > 0) {
                        const jName = isProgrammer ? t('jobs.programmer.name', lang) : t('jobs.teacher.name', lang);
                        resultText += `\n✨ **${jName} Bonus:** +${jobBonus.toLocaleString()} coins (20%)`;
                    }

                    if (bonus > 0) resultText += ` \n✨ **${t('fish.item_bonus', lang)}:** +${bonus.toLocaleString()}`;
                }
                embed.setDescription(`**${t('hangman.word', lang)}:** ${word}\n\n${resultText}`)
                    .setColor(won ? config.COLORS.SUCCESS : config.COLORS.ERROR);
                collector.stop();
            } else {
                embed.setDescription(`${t('hangman.hint', lang)}: ${hint}\n\n${t('hangman.word', lang)}: ${currentDisplay}\n${t('hangman.lives', lang)}: ${'❤️'.repeat(lives)}\n\n${t('hangman.guessed', lang)}: ${Array.from(guessed).join(', ') || t('userinfo.none', lang)}`);
            }

            await msg.edit({ embeds: [embed] });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !gameOver) {
                embed.setDescription(`${config.EMOJIS.TIMER} **${t('wordchain.timeout', lang)}** ${t('hangman.word', lang)} ${t('tictactoe.winner_msg', lang === 'vi' ? 'là' : 'is')} **${word}**.`).setColor(config.COLORS.NEUTRAL);
                msg.edit({ embeds: [embed] });
            }
            startCooldown(message.client, 'hangman', message.author.id);
        });
    }
};
