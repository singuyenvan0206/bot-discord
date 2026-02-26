const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');

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

        // --- FALLBACK: If API fails, use local words ---
        if (!word) {
            const localData = require('../../data/words.json');
            if (localData && localData.words) {
                word = localData.words[Math.floor(Math.random() * localData.words.length)];
                category = t('scramble.cat_random', lang);
            }
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

        // Programmer Interaction: Regex Assist (Reveals 1st and Last letter if not already)
        const user = db.getUser(message.author.id);
        if (user.job === 'programmer' && word.length > 3) {
            hint += `\n💻 **Regex Assist:** \`${word[0].toUpperCase()}...${word[word.length - 1].toUpperCase()}\``;
        }

        const embed = new EmbedBuilder()
            .setTitle(t('scramble.title', lang))
            .setDescription(`${t('scramble.arrange_this', lang)}: **${scrambled}**\n\n💡 **${t('hangman.hint', lang)}:** ${hint}`)
            .setColor(0xE67E22)
            .setFooter({ text: t('scramble.footer', lang) });

        await message.reply({ embeds: [embed] });

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => m.content.toLowerCase() === word.toLowerCase() && !m.author.bot,
                max: 1,
                time: 30_000,
                errors: ['time']
            });

            const winner = collected.first();
            const baseReward = config.ECONOMY.SCRAMBLE_REWARD;

            let { total: totalReward, bonus: bonusAmount, cap } = calculateReward(baseReward, winner.author.id);

            // Programmer Interaction: Tech Bonus (+30%)
            const winningUser = db.getUser(winner.author.id);
            if (winningUser.job === 'programmer') {
                totalReward = Math.floor(totalReward * 1.3);
                bonusAmount = Math.floor(bonusAmount * 1.3);
            }

            db.addBalance(winner.author.id, totalReward);

            const receivedText = lang === 'vi' ? 'và nhận được' : 'and received';
            let msgText = t('scramble.success_msg', lang, {
                winner: winner.author.toString(),
                word: word,
                emoji: config.EMOJIS.COIN,
                amount: totalReward.toLocaleString()
            });

            if (bonusAmount > 0) msgText += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), cap });

            const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
            const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
            addXp(winner.author.id, winXp);

            message.channel.send(msgText);
            startCooldown(message.client, 'scramble', message.author.id);
        } catch {
            message.channel.send(t('scramble.timeout', lang, { word }));
            startCooldown(message.client, 'scramble', message.author.id);
        }
    }
};
