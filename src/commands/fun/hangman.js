const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'hangman',
    aliases: ['hang', 'hm'],
    description: 'Play Hangman!',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
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

                if (!hint) hint = "Mystery Word";
            }
        } catch (error) {
            console.error('Error fetching random word:', error);
        }

        // If API fails to provide a word
        if (!word) {
            return message.reply(`${config.EMOJIS.ERROR} Unable to fetch a word at this time. Please try again later.`);
        }

        const guessed = new Set();
        let lives = 6;
        let gameOver = false;

        function getDisplay() {
            return word.split('').map(l => guessed.has(l) ? l : '\\_').join(' ');
        }

        const embed = new EmbedBuilder()
            .setTitle('😵  Hangman')
            .setDescription(`**Hint:** ${hint}\n\n**Word:** ${getDisplay()}\n**Lives:** ${'❤️'.repeat(lives)}\n\n**Guessed:** ${Array.from(guessed).join(', ') || 'None'}`)
            .setColor(config.COLORS.INFO)
            .setFooter({ text: 'Type a letter to guess!' });

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
                    const baseReward = config.ECONOMY.HANGMAN_REWARD;
                    const { getUserMultiplier } = require('../../utils/multiplier');
                    const multiplier = getUserMultiplier(message.author.id, 'income');
                    const bonus = Math.floor(baseReward * multiplier);
                    const totalReward = baseReward + bonus;

                    db.addBalance(message.author.id, totalReward);

                    let resultStr = `**Word:** ${word}\n\n${config.EMOJIS.SUCCESS} **YOU WON!** (You guessed the full word!)\n${config.EMOJIS.COIN} **+${baseReward} coins!**`;
                    if (bonus > 0) resultStr += `\n✨ **Item Bonus:** +${bonus} (${Math.round(multiplier * 100)}%)`;

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
                let resultText = won ? `${config.EMOJIS.SUCCESS} **YOU WON!**` : '💀 **YOU DIED!**';
                if (won) {
                    const baseReward = config.ECONOMY.HANGMAN_REWARD;
                    const { getUserMultiplier } = require('../../utils/multiplier');
                    const multiplier = getUserMultiplier(message.author.id, 'income');
                    const bonus = Math.floor(baseReward * multiplier);
                    const totalReward = baseReward + bonus;

                    db.addBalance(message.author.id, totalReward);
                    resultText += `\n${config.EMOJIS.COIN} **+${baseReward}** coins!`;
                    if (bonus > 0) resultText += ` *(+${bonus} item bonus)*`;
                }
                embed.setDescription(`**Word:** ${word}\n\n${resultText}`)
                    .setColor(won ? config.COLORS.SUCCESS : config.COLORS.ERROR);
                collector.stop();
            } else {
                embed.setDescription(`**Hint:** ${hint}\n\n**Word:** ${currentDisplay}\n**Lives:** ${'❤️'.repeat(lives)}\n\n**Guessed:** ${Array.from(guessed).join(', ') || 'None'}`);
            }

            await msg.edit({ embeds: [embed] });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !gameOver) {
                embed.setDescription(`${config.EMOJIS.TIMER} **Time's up!** The word was **${word}**.`).setColor(config.COLORS.NEUTRAL);
                msg.edit({ embeds: [embed] });
            }
            startCooldown(message.client, 'hangman', message.author.id);
        });
    }
};
