const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'guess',
    aliases: ['gn'],
    description: 'Guess the number (1-100)',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id);
        const number = Math.floor(Math.random() * 100) + 1;
        const maxAttempts = 10;
        let attempts = 0;

        const embed = new EmbedBuilder()
            .setTitle(t('guess.title', lang))
            .setDescription(t('guess.start', lang))
            .setColor(config.COLORS.INFO);

        await message.reply({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot && !isNaN(parseInt(m.content)),
            time: 60_000,
            max: maxAttempts
        });

        collector.on('collect', async m => {
            const guess = parseInt(m.content);
            attempts++;
            const attemptsLeft = maxAttempts - attempts;

            if (guess === number) {
                const baseReward = config.ECONOMY.GUESS_REWARD_BASE || 100;
                const reward = Math.max(10, baseReward - (attempts * 5));
                db.addBalance(m.author.id, reward);

                await m.reply(t('guess.win', lang, {
                    number,
                    emoji: config.EMOJIS.COIN,
                    amount: reward
                }));
                collector.stop('win');
            } else if (attempts < maxAttempts) {
                const hintKey = guess < number ? 'guess.higher' : 'guess.lower';
                await m.reply(t(hintKey, lang, { attempts: attemptsLeft }));
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'win' && reason !== 'user' && reason !== 'limit') {
                message.channel.send(t('guess.lose', lang, { number }));
            } else if (reason === 'limit' && attempts >= maxAttempts) {
                // This covers the case where max attempts were reached without winning
                message.channel.send(t('guess.lose', lang, { number }));
            }
            startCooldown(message.client, 'guess', message.author.id);
        });
    }
};
