require('dotenv').config();
process.env.DB_NAME = 'databases.db';

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ─── Validate Environment ────────────────────────────────────────

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ Missing DISCORD_TOKEN in .env file');
    process.exit(1);
}

// ─── Create Client ───────────────────────────────────────────────

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Reaction,
        Partials.User,
        Partials.Channel,
    ],
});

// ─── Collections ──────────────────────────────────────────────────

client.commands = new Collection();
client.cooldowns = new Collection();

// ─── Load Commands ────────────────────────────────────────────────

const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.lstatSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(path.join(folderPath, file));
            if ('name' in command && 'execute' in command) {
                client.commands.set(command.name, command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => client.commands.set(alias, command));
                }
                console.log(`📦 Loaded command: !${command.name}`);
            }
        }
    }
}

// ─── Load Events ──────────────────────────────────────────────────

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`🔔 Loaded event: ${event.name}`);
}

const db = require('./database');
const { initScheduler } = require('./utils/scheduler');

async function startBot() {
    await db.getDb();
    console.log('💾 Database initialized (Pre-login)');
    initScheduler(client);
    client.login(TOKEN);
}

startBot();
