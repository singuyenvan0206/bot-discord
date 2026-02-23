const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');

const { isManager } = require('../../utils/permissions');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

// Module-level Map: channelId → collector (game runs independently per channel)
const activeGames = new Map();

module.exports = {
    name: 'wordchain',
    aliases: ['wc'],
    description: 'Chơi Nối Chữ (Word Chain)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        if (activeGames.has(message.channel.id)) {
            return message.reply(t('wordchain.already_running', lang, { prefix: config.PREFIX }));
        }

        // Game state — fully local to this invocation
        const usedWords = new Set();
        const playerScores = new Map();
        let lastChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        let lastPlayerId = null;

        const embed = new EmbedBuilder()
            .setTitle(t('wordchain.title', lang))
            .setDescription(t('wordchain.start_desc', lang, { char: lastChar.toUpperCase() }))
            .setColor(config.COLORS.INFO)
            .setFooter({ text: t('wordchain.stop_footer', lang, { prefix: config.PREFIX }) });

        await message.channel.send({ embeds: [embed] });

        // Helper: validate word via dictionary API
        const isValidWord = async (word) => {
            try {
                const res = await fetch(`${config.API_URLS.DICTIONARY}${encodeURIComponent(word)}`);
                return res.status === 200;
            } catch {
                return true; // Allow if API is down
            }
        };

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot,
        });

        // Register game AFTER collector is created so cleanup is reliable
        activeGames.set(message.channel.id, collector);

        collector.on('collect', async m => {
            const word = m.content.toLowerCase().trim();

            // Stop command (manager only)
            if (word === `${config.PREFIX}stop`) {
                if (isManager(m.member)) {
                    collector.stop('stopped');
                    return message.channel.send(`🛑 **${t('wordchain.stopped_by', lang, { user: m.author })}**`);
                }
                return;
            }

            // Anti-spam: same player cannot go twice in a row
            if (m.author.id === lastPlayerId) {
                return m.react(config.EMOJIS.WAITING);
            }

            // Word validation
            let invalidReason = null;
            if (usedWords.has(word)) invalidReason = t('wordchain.already_used', lang);
            else if (word.charAt(0) !== lastChar) invalidReason = t('wordchain.wrong_start', lang, { char: lastChar.toUpperCase() });
            else if (word.length < 3) invalidReason = t('wordchain.too_short', lang);
            else if (!/^[a-z]+$/.test(word)) invalidReason = t('wordchain.invalid_chars', lang);

            if (invalidReason) {
                await m.react(config.EMOJIS.ERROR);
                const warn = await message.channel.send(`⚠️ ${m.author}, ${invalidReason}`);
                setTimeout(() => warn.delete().catch(() => { }), 3000);
                return;
            }

            // Dictionary check
            const valid = await isValidWord(word);
            if (!valid) return m.react(config.EMOJIS.ERROR);

            // Accept word
            usedWords.add(word);
            lastChar = word.slice(-1);
            lastPlayerId = m.author.id;

            // Reward
            const baseReward = config.ECONOMY.WORDCHAIN_REWARD || 5;
            const { total: totalReward } = calculateReward(baseReward, m.author.id);

            db.addBalance(m.author.id, totalReward);
            playerScores.set(m.author.id, (playerScores.get(m.author.id) || 0) + totalReward);

            await m.react(config.EMOJIS.SUCCESS);
        });

        collector.on('end', (_, reason) => {
            // Always clean up — game is done
            activeGames.delete(message.channel.id);

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
