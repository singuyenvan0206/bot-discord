require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const { EMOJI, BUTTON_ID, createGiveawayEmbed } = require('./utils/embeds');
const { startTimer } = require('./utils/timer');
const { t, getLanguage } = require('./utils/i18n');

// ─── Config ──────────────────────────────────────────────────────

const config = require('./config');

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
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
    ],
    partials: [
        Partials.Message,
        Partials.Reaction,
        Partials.User,
        Partials.Channel,
    ],
});

// ─── Game State ──────────────────────────────────────────────────

const activeChainGames = new Map();

// ─── Load Slash Commands ─────────────────────────────────────────

client.commands = new Collection();
client.cooldowns = new Collection();
const commandsPath = path.join(__dirname, 'commands');
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
    console.log('[DEBUG] Received interaction:', interaction.customId, 'type:', interaction.type, 'in guild:', !!interaction.guildId);
    // Handle button interactions (Giveaways)
    if (interaction.isButton() && interaction.customId === BUTTON_ID) {
        return handleButtonEntry(interaction);
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
                'help': ['command'],
            };

            const optionNames = optionMap[commandName] || [];
            for (const name of optionNames) {
                const raw = interaction.options.get(name);
                if (!raw) continue;

                // Use the correct getter based on actual option type
                if (raw.type === 6) { // USER
                    const userOpt = interaction.options.getUser(name);
                    if (userOpt) args.push(`<@${userOpt.id}>`);
                } else if (raw.type === 4) { // INTEGER
                    const intOpt = interaction.options.getInteger(name);
                    if (intOpt !== null) args.push(String(intOpt));
                } else if (raw.type === 3) { // STRING
                    const strOpt = interaction.options.getString(name);
                    if (strOpt) args.push(strOpt);
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

        // Cooldown handling
        if (!client.cooldowns.has(command.name)) {
            client.cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = client.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const lang = getLanguage(interaction.user.id, interaction.guild?.id);
                return interaction.reply({
                    content: t('common.cooldown', lang, { time: timeLeft.toFixed(1) }),
                    ephemeral: true
                });
            }
        }

        if (!command.manualCooldown) {
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        }

        const lang = getLanguage(messageAdapter.author.id, messageAdapter.guild?.id);

        try {
            await command.execute(messageAdapter, args);
        } catch (error) {
            console.error(`[Slash] Error executing /${commandName}:`, error);
            const errMsg = t('common.error', lang);
            if (!hasReplied) {
                interaction.reply({ content: errMsg, ephemeral: true }).catch(() => { });
            } else {
                interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => { });
            }
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === BUTTON_ID) {
            return handleButtonEntry(interaction);
        }

        if (interaction.customId === 'choose_job_btn') {
            try {
                const lang = getLanguage(interaction.user.id, interaction.guildId);
                const user = db.getUser(interaction.user.id);

                if (user.level < 20) {
                    return interaction.reply({
                        content: t('job.set_error_level', lang, { level: 20 }),
                        ephemeral: !!interaction.guildId
                    });
                }

                const jobs = config.ECONOMY.JOBS;
                const select = new StringSelectMenuBuilder()
                    .setCustomId('job_select')
                    .setPlaceholder(t('job.select_placeholder', lang))
                    .addOptions(
                        Object.values(jobs).map(j => ({
                            label: j.id.charAt(0).toUpperCase() + j.id.slice(1),
                            description: t(`job.info_${j.id}`, lang).substring(0, 100),
                            value: j.id,
                            emoji: j.icon
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(select);

                return await interaction.reply({
                    content: t('job.milestone_desc', lang),
                    components: [row],
                    ephemeral: !!interaction.guildId
                });
            } catch (err) {
                console.error('[Menu Error]', err);
                return interaction.reply({ content: `Lỗi: ${err.message}`, ephemeral: true }).catch(() => { });
            }
        }
    } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'job_select') {
            const lang = getLanguage(interaction.user.id, interaction.guildId);
            const jobId = interaction.values[0];
            const job = config.ECONOMY.JOBS[jobId];
            if (!job) {
                return interaction.reply({
                    content: t('job.set_error_invalid', lang),
                    ephemeral: !!interaction.guildId
                });
            }

            db.updateUser(interaction.user.id, { job: jobId });

            return interaction.update({
                content: t('job.set_success', lang, { job: jobId.charAt(0).toUpperCase() + jobId.slice(1) }),
                components: []
            });
        }
    }
});

const xpCooldowns = new Set();

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // ─── Command Handling ───
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) ||
        client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    const lang = getLanguage(message.author.id, message.guild?.id);

    // Cooldown handling
    if (!client.cooldowns.has(command.name)) {
        client.cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(t('common.cooldown', lang, { time: timeLeft.toFixed(1) }));
        }
    }

    if (!command.manualCooldown) {
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(`[Command] Error executing !${commandName}:`, error);
        message.reply(t('common.error', lang)).catch(() => { });
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
    const guildId = interaction.guildId;
    const lang = getLanguage(interaction.user.id, guildId);
    const giveaway = db.getGiveaway(interaction.message.id);

    if (!giveaway) return interaction.reply({ content: t('giveaway.not_exists', lang), ephemeral: true });
    if (giveaway.ended) return interaction.reply({ content: t('giveaway.already_ended', lang), ephemeral: true });
    if (giveaway.paused) return interaction.reply({ content: t('giveaway.paused_title', lang), ephemeral: true });

    if (giveaway.required_role_id) {
        if (!interaction.member.roles.cache.has(giveaway.required_role_id)) {
            return interaction.reply({ content: t('giveaway.role_required_msg', lang, { roleId: giveaway.required_role_id }), ephemeral: true });
        }
    }

    const participants = db.getParticipantUserIds(giveaway.id);
    if (participants.includes(interaction.user.id)) {
        db.removeParticipant(giveaway.id, interaction.user.id);
        const newCount = db.getParticipantCount(giveaway.id);
        const embed = createGiveawayEmbed(giveaway, newCount, lang);
        const { createEntryButton } = require('./utils/embeds');
        await interaction.update({ embeds: [embed], components: [createEntryButton(false, lang)] });
        return interaction.followUp({ content: t('giveaway.left_giveaway', lang), ephemeral: true });
    }

    db.addParticipant(giveaway.id, interaction.user.id);

    const newCount = db.getParticipantCount(giveaway.id);
    const embed = createGiveawayEmbed(giveaway, newCount, lang);
    const { createEntryButton } = require('./utils/embeds');
    await interaction.update({ embeds: [embed], components: [createEntryButton(false, lang)] });
    return interaction.followUp({ content: t('giveaway.joined_giveaway', lang), ephemeral: true });
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
        const lang = getLanguage(null, giveaway.guild_id);
        const count = db.getParticipantCount(giveaway.id);
        const embed = createGiveawayEmbed(giveaway, count, lang);
        const { createEntryButton } = require('./utils/embeds');
        await message.edit({ embeds: [embed], components: [createEntryButton(false, lang)] });
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
