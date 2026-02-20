const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'scramble',
    aliases: ['scram'],
    description: 'Unscramble the word',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        let word, category, hint;

        try {
            // Try fetching from Random Word API
            const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
            const data = await response.json();

            if (data && data.length > 0) {
                word = data[0];
                category = "Random";

                // Try fetching definition for hint
                try {
                    const defResponse = await fetch(`${config.API_URLS.DICTIONARY}${word}`);
                    const defData = await defResponse.json();

                    if (defData && defData.length > 0 && defData[0].meanings && defData[0].meanings.length > 0) {
                        const meaning = defData[0].meanings[0];
                        if (meaning.definitions && meaning.definitions.length > 0) {
                            category = "Definition";
                            hint = meaning.definitions[0].definition;
                        }
                    }
                } catch (e) {
                    console.error('Error fetching definition:', e);
                }
            }
        } catch (error) {
            console.error('Error fetching random word:', error);
        }

        if (!word) {
            return message.reply(`${config.EMOJIS.ERROR} Unable to fetch a word at this time. Please try again later.`);
        }

        const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');

        if (category === "Definition" && hint) {
            hint = `Definition: **${hint}**`;
        } else {
            hint = `Category: **${category}**` + (Math.random() > 0.5 ? ` | Starts with: **${word[0].toUpperCase()}**` : ` | Length: **${word.length}**`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🔠  Word Scramble')
            .setDescription(`Unscramble this word: **${scrambled}**\n\n💡 **Hint:** ${hint}`)
            .setColor(0xE67E22)
            .setFooter({ text: 'You have 30 seconds!' });

        await message.reply({ embeds: [embed] });

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => m.content.toLowerCase() === word && !m.author.bot,
                max: 1,
                time: 30_000,
                errors: ['time']
            });

            const winner = collected.first();
            const baseReward = config.ECONOMY.SCRAMBLE_REWARD;
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(winner.author.id, 'income');
            const bonus = Math.floor(baseReward * multiplier);
            const totalReward = baseReward + bonus;

            db.addBalance(winner.author.id, totalReward);

            let msgText = `${config.EMOJIS.SUCCESS} **Correct!** ${winner.author} unscrambled the word **${word}** and won ${config.EMOJIS.COIN} **${baseReward}** coins!`;
            if (bonus > 0) msgText += ` ✨ *(+${bonus} item bonus)*`;

            message.channel.send(msgText);
            startCooldown(message.client, 'scramble', message.author.id);
        } catch {
            message.channel.send(`${config.EMOJIS.TIMER} **Time's up!** The word was **${word}**.`);
            startCooldown(message.client, 'scramble', message.author.id);
        }
    }
};
