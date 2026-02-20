const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'wordchain',
    aliases: ['wc'],
    description: 'Play Word Chain',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        if (message.client.activeChainGames?.has(message.channel.id)) {
            return message.reply(`❌ A word chain game is already running in this channel! Type \`${config.PREFIX}stop\` to end it.`);
        }

        if (!message.client.activeChainGames) message.client.activeChainGames = new Set();
        message.client.activeChainGames.add(message.channel.id);

        let usedWords = new Set();
        let playerScores = new Map();
        let lastChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        let turn = null;
        let players = [message.author.id];

        const embed = new EmbedBuilder()
            .setTitle('🔗  Word Chain')
            .setDescription(`Game started! The first word must start with **${lastChar.toUpperCase()}**.\n\nType a word to join!`)
            .setColor(config.COLORS.INFO)
            .setFooter({ text: `Type ${config.PREFIX}stop to end game` });

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
                    return message.channel.send(`🛑 **Game stopped by Manager ${m.author}!**`);
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
            if (usedWords.has(word)) invalidReason = 'Word already used!';
            else if (word.charAt(0) !== lastChar) invalidReason = `Must start with **${lastChar.toUpperCase()}**!`;
            else if (word.length < 3) invalidReason = 'Must be 3+ letters!';
            else if (!/^[a-z]+$/.test(word)) invalidReason = 'Must be a single English word!';

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
                .join('\n') || 'No words were played.';

            const endEmbed = new EmbedBuilder()
                .setTitle('🛑  Word Chain — Game Over!')
                .setDescription(`**Total words:** ${usedWords.size}\n\n${scoreboard}`)
                .setColor(config.COLORS.ERROR);
            message.channel.send({ embeds: [endEmbed] });
            startCooldown(message.client, 'wordchain', message.author.id);
        });
    }
};
