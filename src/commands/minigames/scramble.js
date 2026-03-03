const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { calculateReward } = require('../../utils/multiplier');

const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'scramble',
    aliases: ['scram', 'scr'],
    description: 'Sắp xếp từ (Unscramble the word)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        let word, category, hint;

        try {
            // Using Datamuse API - Extremely stable and professional
            // We use a random 'seed' word to get related common words for variety
            const seeds = ['common', 'object', 'thing', 'person', 'place', 'nature', 'life', 'world', 'time', 'space'];
            const seed = seeds[Math.floor(Math.random() * seeds.length)];

            const response = await fetch(`https://api.datamuse.com/words?ml=${seed}&max=100&md=d`);
            const data = await response.json();

            if (data && data.length > 0) {
                // Filter for reasonable length words (4-10 chars) and pick one
                const validWords = data.filter(w => w.word.length >= 4 && w.word.length <= 10 && !w.word.includes(' '));
                const selected = validWords[Math.floor(Math.random() * validWords.length)] || data[0];

                word = selected.word;
                category = t('scramble.cat_random', lang);

                // Extract definition from Datamuse metadata if available
                if (selected.defs && selected.defs.length > 0) {
                    category = t('scramble.cat_def', lang);
                    // Datamuse defs are often prefixed with 'part of speech\t', clean it up
                    hint = selected.defs[0].split('\t').pop();
                }
            }
        } catch (error) {
            console.error('Error fetching word from Datamuse:', error);
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
        const user = await db.getUser(message.author.id, message.guild.id);
        if (user.job === 'programmer' && word.length > 3) {
            hint += `\n💻 **Regex Assist:** \`${word[0].toUpperCase()}...${word[word.length - 1].toUpperCase()}\``;
        }

        const embed = new EmbedBuilder()
            .setTitle(t('scramble.title', lang))
            .setDescription(`${t('scramble.arrange_this', lang)}: **${scrambled}**\n\n💡 **${t('hangman.hint', lang)}:** ${hint}`)
            .setColor(0xE67E22)
            .setFooter({ text: t('scramble.footer', lang) });

        await message.reply({ embeds: [embed] });

        // Grant Action XP
        const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
        await addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => m.author.id === message.author.id && m.content.toLowerCase() === word.toLowerCase() && !m.author.bot,
                max: 1,
                time: 30_000,
                errors: ['time']
            });

            const winner = collected.first();
            const baseReward = config.ECONOMY.SCRAMBLE_REWARD;

            let { total: totalReward, bonus: bonusAmount, percent } = await calculateReward(baseReward, winner.member);

            // Programmer Interaction: Tech Bonus (+30%)
            const winningUser = await db.getUser(winner.author.id, message.guild.id);
            if (winningUser.job === 'programmer') {
                totalReward = Math.floor(totalReward * 1.3);
                bonusAmount = Math.floor(bonusAmount * 1.3);
            }

            await db.addBalance(message.guild.id, winner.author.id, totalReward);

            const receivedText = lang === 'vi' ? 'và nhận được' : 'and received';
            let msgText = t('scramble.success_msg', lang, {
                winner: winner.author.toString(),
                word: word,
                emoji: config.EMOJIS.COIN,
                amount: totalReward.toLocaleString()
            });

            if (bonusAmount > 0) msgText += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent: percent.toLocaleString() });

            const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
            const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
            await addXp(winner.member, winXp, message.guild.id);

            message.channel.send(msgText);
            startCooldown(message.client, 'scramble', message.author.id);
        } catch {
            message.channel.send(t('scramble.timeout', lang, { word }));
            startCooldown(message.client, 'scramble', message.author.id);
        }
    }
};
