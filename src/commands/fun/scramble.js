const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'scramble',
    aliases: ['scram', 'scr'],
    description: 'Sắp xếp lại từ đã bị xáo trộn',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        let word, category, hint;

        try {
            // Try fetching from Random Word API
            const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
            const data = await response.json();

            if (data && data.length > 0) {
                word = data[0];
                category = t('scramble.cat_random', lang);

                // Try fetching definition for hint
                try {
                    const defResponse = await fetch(`${config.API_URLS.DICTIONARY}${word}`);
                    const defData = await defResponse.json();

                    if (defData && defData.length > 0 && defData[0].meanings && defData[0].meanings.length > 0) {
                        const meaning = defData[0].meanings[0];
                        if (meaning.definitions && meaning.definitions.length > 0) {
                            category = t('scramble.cat_def', lang);
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
            return message.reply(`${config.EMOJIS.ERROR} ${t('hangman.fetch_error', lang)}`);
        }

        const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');

        if (category === t('scramble.cat_def', lang) && hint) {
            hint = `${t('scramble.cat_def', lang)}: **${hint}**`;
        } else {
            hint = `${t('scramble.category', lang)}: **${category}**` + (Math.random() > 0.5 ? ` | ${t('scramble.starts_with', lang)}: **${word[0].toUpperCase()}**` : ` | ${t('scramble.length', lang)}: **${word.length}**`);
        }

        const embed = new EmbedBuilder()
            .setTitle(t('scramble.title', lang))
            .setDescription(`${t('scramble.arrange_this', lang)}: **${scrambled}**\n\n💡 **${t('hangman.hint', lang)}:** ${hint}`)
            .setColor(0xE67E22)
            .setFooter({ text: t('scramble.footer', lang) });

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

            const receivedText = lang === 'vi' ? 'và nhận được' : 'and received';
            let msgText = `${config.EMOJIS.SUCCESS} **${t('scramble.correct', lang)}** ${winner.author} ${t('scramble.found_word', lang)} **${word}** ${receivedText} ${config.EMOJIS.COIN} **${baseReward}** coins!`;
            if (bonus > 0) msgText += ` ✨ *(${t('fish.item_bonus', lang)} +${bonus})*`;

            message.channel.send(msgText);
            startCooldown(message.client, 'scramble', message.author.id);
        } catch {
            message.channel.send(t('scramble.timeout', lang, { word }));
            startCooldown(message.client, 'scramble', message.author.id);
        }
    }
};
