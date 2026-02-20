const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'wordchain',
    aliases: ['wc'],
    description: 'Chơi Nối Chữ (Word Chain)',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        if (message.client.activeChainGames?.has(message.channel.id)) {
            return message.reply(t('wordchain.already_running', lang, { prefix: config.PREFIX }));
        }

        if (!message.client.activeChainGames) message.client.activeChainGames = new Set();
        message.client.activeChainGames.add(message.channel.id);

        let usedWords = new Set();
        let playerScores = new Map();
        let lastChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        let turn = null;
        let players = [message.author.id];

        const embed = new EmbedBuilder()
            .setTitle(t('wordchain.title', lang))
            .setDescription(t('wordchain.start_desc', lang, { char: lastChar.toUpperCase() }))
            .setColor(config.COLORS.INFO)
            .setFooter({ text: t('wordchain.stop_footer', lang, { prefix: config.PREFIX }) });

        await message.channel.send({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot,
        });

        // Helper function for word validation
        const isValidWord = async (word) => {
            try {
                const response = await fetch(`${config.API_URLS.DICTIONARY}${encodeURIComponent(word)}`);
                return response.status === 200;
            } catch (error) {
                console.error('Dictionary API Error:', error);
                return true; // Fallback to allow words if API is down
            }
        };

        collector.on('collect', async m => {
            const word = m.content.toLowerCase().trim();

            // Check for stop command
            if (word === `${config.PREFIX}stop`) {
                const { isManager } = require('../../utils/permissions');
                if (isManager(m.member)) {
                    collector.stop('stopped');
                    return message.channel.send(`🛑 **${t('wordchain.stopped_by', lang, { user: m.author })}**`);
                }
            }

            // Join game logic
            if (!players.includes(m.author.id)) {
                players.push(m.author.id);
            }

            // Anti-spam: cannot answer twice in a row
            if (m.author.id === turn) {
                return m.react(config.EMOJIS.WAITING);
            }

            // Invalid word checks
            let invalidReason = null;
            if (usedWords.has(word)) invalidReason = t('wordchain.already_used', lang);
            else if (word.charAt(0) !== lastChar) invalidReason = t('wordchain.wrong_start', lang, { char: lastChar.toUpperCase() });
            else if (word.length < 3) invalidReason = t('wordchain.too_short', lang);
            else if (!/^[a-z]+$/.test(word)) invalidReason = t('wordchain.invalid_chars', lang);

            if (invalidReason) {
                await m.react(config.EMOJIS.ERROR);
                const warningMsg = await message.channel.send(`⚠️ ${m.author}, ${invalidReason}`);
                setTimeout(() => warningMsg.delete().catch(() => { }), 3000);
                return;
            }

            // Additional Dictionary Check
            const valid = await isValidWord(word);
            if (!valid) {
                return m.react(config.EMOJIS.ERROR);
            }

            usedWords.add(word);
            lastChar = word.slice(-1);
            turn = m.author.id;

            // Reward per valid word + income bonus
            const baseReward = config.ECONOMY.WORDCHAIN_REWARD;
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(m.author.id, 'income');
            const bonus = Math.floor(baseReward * multiplier);
            const totalReward = baseReward + bonus;

            db.addBalance(m.author.id, totalReward);
            playerScores.set(m.author.id, (playerScores.get(m.author.id) || 0) + totalReward);

            await m.react(config.EMOJIS.SUCCESS);
        });

        collector.on('end', (collected, reason) => {
            message.client.activeChainGames.delete(message.channel.id);
            const scoreboard = [...playerScores.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([id, coins], i) => `**${i + 1}.** <@${id}> — ${config.EMOJIS.COIN} ${coins} coins`)
                .join('\n') || t('wordchain.no_participants', lang);

            const endEmbed = new EmbedBuilder()
                .setTitle(t('wordchain.end_title', lang))
                .setDescription(`**${t('wordchain.total_words', lang)}:** ${usedWords.size}\n\n${scoreboard}`)
                .setColor(config.COLORS.ERROR);
            message.channel.send({ embeds: [endEmbed] });
            startCooldown(message.client, 'wordchain', message.author.id);
        });
    }
};
