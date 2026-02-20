const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');

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
                    const defResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
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

        // If API fails to provide a word, send an error message
        if (!word) {
            return message.reply('❌ Unable to fetch a word at this time. Please try again later.');
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
            .setColor(0x3498DB)
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
                    const reward = 50;
                    db.addBalance(message.author.id, reward);
                    embed.setDescription(`**Word:** ${word}\n\n🎉 **YOU WON!** (You guessed the full word!)\n💰 **+${reward} coins!**`)
                        .setColor(0x2ECC71);
                    collector.stop();
                    await msg.edit({ embeds: [embed] });
                    return;
                } else {
                    lives--;
                    // Optional: Feedback for wrong word?
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

            if (gameOver) return; // Already handled above if won by full word

            if (won || lost) {
                gameOver = true;
                let resultText = won ? '🎉 **YOU WON!**' : '💀 **YOU DIED!**';
                if (won) {
                    const reward = 50;
                    db.addBalance(message.author.id, reward);
                    resultText += `\n💰 **+${reward} coins!**`;
                }
                embed.setDescription(`**Word:** ${word}\n\n${resultText}`)
                    .setColor(won ? 0x2ECC71 : 0xE74C3C);
                collector.stop();
            } else {
                embed.setDescription(`**Hint:** ${hint}\n\n**Word:** ${currentDisplay}\n**Lives:** ${'❤️'.repeat(lives)}\n\n**Guessed:** ${Array.from(guessed).join(', ') || 'None'}`);
            }

            await msg.edit({ embeds: [embed] });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !gameOver) {
                embed.setDescription(`⏰ **Time's up!** The word was **${word}**.`).setColor(0x95A5A6);
                msg.edit({ embeds: [embed] });
            }
            startCooldown(message.client, 'hangman', message.author.id);
        });
    }
};
