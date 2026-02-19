require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const { EMOJI, BUTTON_ID, createGiveawayEmbed } = require('./utils/embeds');
const { startTimer } = require('./utils/timer');

// ─── Config ──────────────────────────────────────────────────────

const PREFIX = '$';

// ─── Validate Environment ────────────────────────────────────────

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ Missing DISCORD_TOKEN in .env file');
    console.error('   Copy .env.example to .env and fill in your bot token.');
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
    ],
    partials: [
        Partials.Message,
        Partials.Reaction,
        Partials.User,
    ],
});

// ─── Game State ──────────────────────────────────────────────────

const activeChainGames = new Map();

// ─── Load Slash Commands ─────────────────────────────────────────

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
// commandsPath is already declared above if I messed up, better to just replace the whole block carefully.
// Actually, looking at the previous diff, I replaced lines 48-56.
// The original code had `const commandsPath = ...` at line 47.
// I inserted `const commandsPath = ...` at the start of my replacement block.
// So I should just remove the redeclaration in the replacement.

const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);

    // Handle files in root of commands/
    if (folder.endsWith('.js')) {
        const command = require(folderPath);
        if ('name' in command && 'execute' in command) {
            client.commands.set(command.name, command);
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => client.commands.set(alias, command));
            }
            console.log(`📦 Loaded command: !${command.name} ${command.aliases ? `(${command.aliases.join(', ')})` : ''}`);
        }
        continue;
    }

    // Handle subdirectories
    if (fs.lstatSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(path.join(folderPath, file));
            if ('name' in command && 'execute' in command) {
                client.commands.set(command.name, command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => client.commands.set(alias, command));
                }
                console.log(`📦 Loaded command: !${command.name} ${command.aliases ? `(${command.aliases.join(', ')})` : ''}`);
            }
        }
    }
}

// ─── Slash Command & Button Handler ─────────────────────────────

// ─── Command & Button Handler ──────────────────────────────────

client.on(Events.InteractionCreate, async interaction => {
    // Handle button interactions (Giveaways)
    if (interaction.isButton()) {
        if (interaction.customId === BUTTON_ID) {
            return handleButtonEntry(interaction);
        }
        return;
    }

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const commandName = interaction.commandName;
        const command = client.commands.get(commandName);
        if (!command) return;

        // Build args array from slash command options
        let args = [];

        // Special handling for giveaway subcommands
        if (commandName === 'giveaway') {
            const sub = interaction.options.getSubcommand();
            args.push(sub);
            if (sub === 'start') {
                args.push(interaction.options.getString('duration'));
                args.push(String(interaction.options.getInteger('winners')));
                args.push(interaction.options.getString('prize'));
            } else if (['end', 'reroll', 'pause', 'resume', 'delete'].includes(sub)) {
                args.push(interaction.options.getString('message_id'));
            }
        } else {
            // Generic option extraction — maintains order for existing execute() functions
            const optionMap = {
                // coinflip: choice, bet
                'coinflip': ['choice', 'bet'],
                // 8ball: question
                '8ball': ['question'],
                // transfer: user, amount
                'transfer': ['user', 'amount'],
                // buy: item
                'buy': ['item'],
                // bet-only commands
                'blackjack': ['bet'], 'poker': ['bet'], 'dice': ['bet'],
                'slots': ['bet'], 'minesweeper': ['bet'],
                // user-optional commands
                'balance': ['user'], 'avatar': ['user'], 'userinfo': ['user'],
            };

            const optionNames = optionMap[commandName] || [];
            for (const name of optionNames) {
                const userOpt = interaction.options.getUser(name);
                const intOpt = interaction.options.getInteger(name);
                const strOpt = interaction.options.getString(name);

                if (userOpt) {
                    args.push(`<@${userOpt.id}>`);
                } else if (intOpt !== null && intOpt !== undefined) {
                    args.push(String(intOpt));
                } else if (strOpt) {
                    args.push(strOpt);
                }
            }
        }

        // Create a message-like adapter so existing execute() functions work
        let hasReplied = false;
        const messageAdapter = {
            author: interaction.user,
            member: interaction.member,
            channel: interaction.channel,
            guild: interaction.guild,
            client: interaction.client,
            createdTimestamp: interaction.createdTimestamp,
            content: `$${commandName} ${args.join(' ')}`.trim(),
            mentions: {
                users: {
                    first: () => {
                        const userOpt = interaction.options.getUser('user');
                        return userOpt || null;
                    }
                }
            },
            reply: async (content) => {
                try {
                    // Normalize to object and add fetchReply so we get a Message back
                    if (typeof content === 'string') {
                        content = { content, fetchReply: true };
                    } else {
                        content = { ...content, fetchReply: true };
                    }

                    let msg;
                    if (!hasReplied) {
                        hasReplied = true;
                        msg = await interaction.reply(content);
                    } else {
                        msg = await interaction.followUp(content);
                    }
                    return msg;
                } catch (err) {
                    // Fallback to channel.send if interaction expired
                    if (typeof content === 'object') delete content.fetchReply;
                    return await interaction.channel.send(content).catch(() => { });
                }
            },
            edit: async (content) => {
                try {
                    return await interaction.editReply(content);
                } catch {
                    return null;
                }
            },
            react: async () => { },
            delete: async () => { },
        };

        try {
            await command.execute(messageAdapter, args);
        } catch (error) {
            console.error(`[Slash] Error executing /${commandName}:`, error);
            const errMsg = '❌ An error occurred while executing this command.';
            if (!hasReplied) {
                interaction.reply({ content: errMsg, ephemeral: true }).catch(() => { });
            } else {
                interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => { });
            }
        }
    }
});

const xpCooldowns = new Set();

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // ─── Leveling System (Removed) ───
    // if (!xpCooldowns.has(message.author.id)) { ... }

    // ─── Command Handling ───
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(`[Command] Error executing !${commandName}:`, error);
        message.reply('❌ An error occurred while executing this command.').catch(() => { });
    }
});

// ─── Duration Parser ─────────────────────────────────────────────

function parseDuration(str) {
    const ms = require('ms');
    const simple = ms(str);
    if (simple) return simple;

    const regex = /(\d+)\s*(d|h|m|s)/gi;
    let total = 0;
    let match;
    while ((match = regex.exec(str)) !== null) {
        const val = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        switch (unit) {
            case 'd': total += val * 86400000; break;
            case 'h': total += val * 3600000; break;
            case 'm': total += val * 60000; break;
            case 's': total += val * 1000; break;
        }
    }
    return total || null;
}

// ─── Button Entry Handler ────────────────────────────────────────

async function handleButtonEntry(interaction) {
    const giveaway = db.getGiveaway(interaction.message.id);

    if (!giveaway) return interaction.reply({ content: '❌ This giveaway no longer exists.', ephemeral: true });
    if (giveaway.ended) return interaction.reply({ content: '❌ This giveaway has already ended.', ephemeral: true });
    if (giveaway.paused) return interaction.reply({ content: '⏸️ This giveaway is currently paused.', ephemeral: true });

    if (giveaway.required_role_id) {
        if (!interaction.member.roles.cache.has(giveaway.required_role_id)) {
            return interaction.reply({ content: `❌ You need the <@&${giveaway.required_role_id}> role to enter.`, ephemeral: true });
        }
    }

    const participants = db.getParticipantUserIds(giveaway.id);
    if (participants.includes(interaction.user.id)) {
        return interaction.reply({ content: '✅ You have already entered! Good luck! 🍀', ephemeral: true });
    }

    db.addParticipant(giveaway.id, interaction.user.id);

    const newCount = db.getParticipantCount(giveaway.id);
    const embed = createGiveawayEmbed(giveaway, newCount);
    const { createEntryButton } = require('./utils/embeds');
    await interaction.update({ embeds: [embed], components: [createEntryButton()] });
}

// ─── Reaction Handlers (Giveaway Entry) ──────────────────────────

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    if (reaction.message.partial) { try { await reaction.message.fetch(); } catch { return; } }

    if (reaction.emoji.name !== EMOJI) return;

    const giveaway = db.getGiveaway(reaction.message.id);
    if (!giveaway || giveaway.ended) return;

    if (giveaway.paused) {
        await reaction.users.remove(user.id).catch(() => { });
        try { await user.send('⏸️ This giveaway is currently paused.'); } catch { }
        return;
    }

    if (giveaway.required_role_id) {
        try {
            const guild = await client.guilds.fetch(giveaway.guild_id);
            const member = await guild.members.fetch(user.id);
            if (!member.roles.cache.has(giveaway.required_role_id)) {
                await reaction.users.remove(user.id).catch(() => { });
                try { await user.send(`❌ You need the <@&${giveaway.required_role_id}> role to enter.`); } catch { }
                return;
            }
        } catch { return; }
    }

    db.addParticipant(giveaway.id, user.id);
    await updateGiveawayEmbed(reaction.message, giveaway);
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    if (reaction.emoji.name !== EMOJI) return;

    const giveaway = db.getGiveaway(reaction.message.id);
    if (!giveaway || giveaway.ended) return;

    db.removeParticipant(giveaway.id, user.id);
    await updateGiveawayEmbed(reaction.message, giveaway);
});

async function updateGiveawayEmbed(message, giveaway) {
    try {
        const count = db.getParticipantCount(giveaway.id);
        const embed = createGiveawayEmbed(giveaway, count);
        const { createEntryButton } = require('./utils/embeds');
        await message.edit({ embeds: [embed], components: [createEntryButton()] });
    } catch (err) {
        console.error('[Giveaway] Failed to update embed:', err);
    }
}

// ─── Bot Ready ───────────────────────────────────────────────────

client.once(Events.ClientReady, async readyClient => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     🎉  Giveaway Bot is Online!  🎉         ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Logged in as: ${readyClient.user.tag.padEnd(29)}║`);
    console.log(`║  Servers:      ${String(readyClient.guilds.cache.size).padEnd(29)}║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    await db.getDb();
    console.log('💾 Database initialized');

    startTimer(client);

    const { ActivityType } = require('discord.js');
    readyClient.user.setActivity(`/help | /giveaway`, { type: ActivityType.Listening });
});

// ─── Graceful Shutdown ───────────────────────────────────────────

process.on('SIGINT', () => {
    console.log('\n🔴 Shutting down gracefully...');
    const { stopTimer } = require('./utils/timer');
    stopTimer();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔴 Shutting down gracefully...');
    const { stopTimer } = require('./utils/timer');
    stopTimer();
    client.destroy();
    process.exit(0);
});

// ─── Login ───────────────────────────────────────────────────────

client.login(TOKEN);
