require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../database');
const config = require('../config');
const { t, getLanguage } = require('../utils/i18n');
const { calculateReward } = require('../utils/multiplier');
const { isManager } = require('../utils/permissions');

// Validate Environment
const TOKEN = process.env.WORDCHAIN_TOKEN || process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ Missing DISCORD_TOKEN in .env file');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.User],
});

// Module-level Map: channelId → collector
const activeGames = new Map();

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

const isValidWord = async (word) => {
    if (dictCache.has(word)) return dictCache.get(word);

    try {
        const response = await fetch(`${config.API_URLS.DICTIONARY}${encodeURIComponent(word)}`);
        const isValid = response.status === 200;

        dictCache.set(word, isValid);
        saveDictCache();

        return isValid;
    } catch (e) {
        return true;
    }
};

client.once(Events.ClientReady, () => {
    console.log(`✅ Word Chain Standalone Bot (LINKED) is ready as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        // Blacklist Check
        const rawBlacklist = await db.getGuildSetting(message.guild.id, 'blacklisted_channels', '[]');
        let guildBlacklist = [];
        try { guildBlacklist = JSON.parse(rawBlacklist); } catch (e) { guildBlacklist = []; }

        const isOwner = config.OWNER_ID === message.author.id;
        if ((config.BLACKLISTED_CHANNELS.includes(message.channel.id) || guildBlacklist.includes(message.channel.id)) && !isOwner) {
            return;
        }

        const lang = await getLanguage(message.author.id, message.guild.id);
        const guildRow = await db.getGuild(message.guild.id);
        const prefix = guildRow?.prefix || config.PREFIX;
        const content = message.content.toLowerCase().trim();

        // 1. Get Guild Settings
        const wcChannelId = guildRow?.wordchain_channel;
        const isWcChannel = wcChannelId && message.channel.id === wcChannelId;

        // 2. Start Game Command
        if (content === `${prefix}wordchain` || content === `${prefix}wc`) {
            if (wcChannelId && !isWcChannel) {
                return message.reply(t('wordchain.wrong_channel', lang, { channel: `<#${wcChannelId}>` }));
            }

            if (activeGames.has(message.channel.id)) {
                return message.reply(t('wordchain.already_running', lang, { prefix }));
            }

            return startGame(message, lang);
        }

        // 3. Passive Mode: If in WC channel and NOT a command, handle as word
        if (isWcChannel && !content.startsWith(prefix) && !activeGames.has(message.channel.id)) {
            if (/^[a-z]{3,}$/.test(content)) {
                return startGame(message, lang, true);
            }
        }
    } catch (error) {
        console.error(`[WC Bot] Fatal error in messageCreate:`, error);
    }
});

async function startGame(message, lang, passive = false) {
    try {
        const guildRow = await db.getGuild(message.guild.id);
        const prefix = guildRow?.prefix || config.PREFIX;
        const { client } = message;

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

        if (passive) {
            embed.setAuthor({ name: "Word Chain Auto-Start" });
        }

        await message.channel.send({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot
        });

        activeGames.set(message.channel.id, collector);

        collector.on('collect', async m => {
            try {
                const word = m.content.toLowerCase().trim();

                if (word.startsWith(prefix) && word !== `${prefix}stop`) return;

                if (word === `${prefix}stop`) {
                    if (await isManager(m.member)) {
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
                else if (word.length < 2) invalidReason = t('wordchain.too_short', lang);
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

                const baseReward = config.ECONOMY.WORDCHAIN_REWARD || 150;
                let { total: totalReward } = await calculateReward(baseReward, m.member, 'income', { category: 'minigame' });

                await db.addBalance(m.guild.id, m.author.id, totalReward);
                playerScores.set(m.author.id, (playerScores.get(m.author.id) || 0) + totalReward);

                const { addXp, XP_AMOUNTS, sendLevelUpMessage } = require('../utils/leveling');
                const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.MESSAGE.max - XP_AMOUNTS.MESSAGE.min + 1)) + XP_AMOUNTS.MESSAGE.min;
                const xpResult = await addXp(m.member, xpAmount, m.guild.id);
                if (xpResult.leveledUp) {
                    sendLevelUpMessage(m, xpResult, lang).catch(() => { });
                }

                await m.react(config.EMOJIS.SUCCESS).catch(() => { });
            } catch (err) {
                console.error('[Word Chain Error]:', err);
            }
        });

        collector.on('end', (_, reason) => {
            try {
                activeGames.delete(message.channel.id);
                if (reason === 'stopped') return;

                const scoreboard = [...playerScores.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([id, coins], i) => `**${i + 1}.** <@${id}> — ${config.EMOJIS.COIN} **${coins.toLocaleString()}**`)
                    .join('\n') || t('wordchain.no_participants', lang);

                const endEmbed = new EmbedBuilder()
                    .setTitle(t('wordchain.end_title', lang))
                    .setDescription(`**${t('wordchain.total_words', lang)}:** ${usedWords.size}\n\n${scoreboard}`)
                    .setColor(config.COLORS.ERROR);

                if (reason === 'time') endEmbed.setTitle(`⌛ ${t('wordchain.timeout', lang)}`);

                message.channel.send({ embeds: [endEmbed] });
            } catch (err) {
                console.error('[WC Bot] End Event Error:', err);
            }
        });
    } catch (error) {
        console.error(`[WC Bot] Error in startGame:`, error);
    }
}

async function startBot() {
    await db.getDb();
    console.log('💾 Database initialized for Word Chain Standalone (LINKED)');
    client.login(TOKEN);
}

startBot();
