process.env.DB_NAME = 'src/wordchain/wordchain.db';
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t, getLanguage } = require('../utils/i18n');
const { calculateReward } = require('../utils/multiplier');
const { isManager } = require('../utils/permissions');

// Validate Environment
const TOKEN = process.env.WORDCHAIN_TOKEN || process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ Missing DISCORD_TOKEN or WORDCHAIN_TOKEN in .env file');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.User],
});

// Module-level Map: channelId → collector (game runs independently per channel)
const activeGames = new Map();

client.once(Events.ClientReady, () => {
    console.log(`✅ Word Chain Standalone Bot is ready as ${client.user.tag}`);
});

const fs = require('fs');
const path = require('path');

// Dictionary cache logic
const CACHE_FILE = path.join(__dirname, 'wordCache.json');
let dictCache = new Map();

try {
    if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        dictCache = new Map(Object.entries(parsed));
    }
} catch (e) {
    console.error('⚠️ Failed to load word dictionary cache:', e.message);
}

function saveDictCache() {
    try {
        const obj = Object.fromEntries(dictCache);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(obj));
    } catch (e) {
        console.error('⚠️ Failed to save word dictionary cache:', e.message);
    }
}

// Helper: validate word via dictionary API
const isValidWord = async (word) => {
    if (dictCache.has(word)) return dictCache.get(word);

    try {
        const response = await fetch(`${config.API_URLS.DICTIONARY}${encodeURIComponent(word)}`);
        const isValid = response.status === 200;

        dictCache.set(word, isValid);
        saveDictCache();

        return isValid;
    } catch (e) {
        console.warn('⚠️ Dictionary API error, skipping validation:', e.message);
        return true; // Allow if API is down
    }
};

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const lang = getLanguage(message.author.id, message.guild.id);
    const prefix = config.PREFIX;
    const content = message.content.toLowerCase().trim();

    // Command Check: $wordchain or $wc
    if (content.startsWith(`${prefix}wordchain`) || content.startsWith(`${prefix}wc`)) {
        if (activeGames.has(message.channel.id)) {
            return message.reply(t('wordchain.already_running', lang, { prefix }));
        }

        // Game state
        const usedWords = new Set();
        const playerScores = new Map();
        let lastChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        let lastPlayerId = null;

        const embed = new EmbedBuilder()
            .setTitle(t('wordchain.title', lang))
            .setDescription(t('wordchain.start_desc', lang, { char: lastChar.toUpperCase() }))
            .setColor(config.COLORS.INFO)
            .setFooter({ text: t('wordchain.stop_footer', lang, { prefix }) });

        await message.channel.send({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot,
        });

        activeGames.set(message.channel.id, collector);

        collector.on('collect', async m => {
            const word = m.content.toLowerCase().trim();

            if (word.startsWith(prefix) && word !== `${prefix}stop`) return;

            if (word === `${prefix}stop`) {
                if (isManager(m.member)) {
                    collector.stop('stopped');
                    return message.channel.send(`🛑 **${t('wordchain.stopped_by', lang, { user: m.author.username })}**`);
                }
                return;
            }

            if (m.author.id === lastPlayerId) {
                return m.react(config.EMOJIS.WAITING).catch(() => { });
            }

            let invalidReason = null;
            if (usedWords.has(word)) invalidReason = t('wordchain.already_used', lang);
            else if (word.charAt(0) !== lastChar) invalidReason = t('wordchain.wrong_start', lang, { char: lastChar.toUpperCase() });
            else if (word.length < 3) invalidReason = t('wordchain.too_short', lang);
            else if (!/^[a-z]+$/.test(word)) invalidReason = t('wordchain.invalid_chars', lang);

            if (invalidReason) {
                await m.react(config.EMOJIS.ERROR).catch(() => { });
                const warn = await message.channel.send(`⚠️ ${m.author}, ${invalidReason}`);
                setTimeout(() => warn.delete().catch(() => { }), 3000);
                return;
            }

            const waitReaction = await m.react(config.EMOJIS.WAITING).catch(() => null);
            const valid = await isValidWord(word);

            if (waitReaction) {
                waitReaction.users.remove(client.user.id).catch(() => { });
            }

            if (!valid) return m.react(config.EMOJIS.ERROR).catch(() => { });

            // Accept word
            usedWords.add(word);
            lastChar = word.slice(-1);
            lastPlayerId = m.author.id;

            const baseReward = config.ECONOMY.WORDCHAIN_REWARD || 5;
            let { total: totalReward } = calculateReward(baseReward, m.member, 'income');

            db.addBalance(m.author.id, totalReward);
            playerScores.set(m.author.id, (playerScores.get(m.author.id) || 0) + totalReward);

            // Grant XP for valid word
            const { addXp, XP_AMOUNTS } = require('../utils/leveling');
            const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.MESSAGE.max - XP_AMOUNTS.MESSAGE.min + 1)) + XP_AMOUNTS.MESSAGE.min;
            addXp(m.member, xpAmount);

            await m.react(config.EMOJIS.SUCCESS).catch(() => { });
        });

        collector.on('end', (_, reason) => {
            activeGames.delete(message.channel.id);

            const scoreboard = [...playerScores.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([id, coins], i) => `**${i + 1}.** <@${id}> — ${config.EMOJIS.COIN} **${coins.toLocaleString()}**`)
                .join('\n') || t('wordchain.no_participants', lang);

            const endEmbed = new EmbedBuilder()
                .setTitle(t('wordchain.end_title', lang))
                .setDescription(`**${t('wordchain.total_words', lang)}:** ${usedWords.size}\n\n${scoreboard}`)
                .setColor(config.COLORS.ERROR);

            message.channel.send({ embeds: [endEmbed] });
        });
    }
});

const start = async () => {
    await db.getDb();
    console.log('💾 Database initialized');
    client.login(TOKEN);
};

start();
