require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const { EMOJI, BUTTON_ID, createGiveawayEmbed } = require('./utils/embeds');
const { startTimer } = require('./utils/timer');

// ─── Config ──────────────────────────────────────────────────────

const PREFIX = '!';

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
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`📦 Loaded command: /${command.data.name}`);
    }
}

// ─── Slash Command & Button Handler ─────────────────────────────

client.on(Events.InteractionCreate, async interaction => {
    // Handle button interactions
    if (interaction.isButton()) {
        if (interaction.customId === BUTTON_ID) {
            return handleButtonEntry(interaction);
        }


        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`[Command] Error executing /${interaction.commandName}:`, error);
        const reply = {
            content: '❌ An error occurred while executing this command.',
            ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => { });
        } else {
            await interaction.reply(reply).catch(() => { });
        }
    }
});

const xpCooldowns = new Set();
// ─── Prefix Command Handler (!commands) ──────────────────────────

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // ─── Leveling System ───
    if (!xpCooldowns.has(message.author.id)) {
        const xpGain = Math.floor(Math.random() * 11) + 15; // 15-25 XP
        const user = db.addXp(message.author.id, xpGain);

        const nextLevelXp = (user.level + 1) * 100;
        if (user.xp >= nextLevelXp) {
            user.level++;
            user.xp -= nextLevelXp;
            db.updateUser(user.id, { level: user.level, xp: user.xp });
            message.channel.send(`🎉 **Level Up!** ${message.author} is now **Level ${user.level}**! 🆙`);
        }

        xpCooldowns.add(message.author.id);
        setTimeout(() => xpCooldowns.delete(message.author.id), 60_000); // 1 minute cooldown
    }

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            // ── Fun Commands ─────────────────────────────────────
            case 'coinflip': case 'flip': case 'cf': return prefixCoinflip(message, args);
            case 'dice': case 'roll': case 'd': return prefixDice(message, args);
            case '8ball': case '8b': return prefix8Ball(message, args);
            case 'rps': return prefixRPS(message, args);
            case 'trivia': case 't': return prefixTrivia(message);
            case 'guess': case 'g': return prefixGuess(message);
            case 'wyr': return prefixWYR(message);
            case 'scramble': case 'sc': return prefixScramble(message);
            case 'blackjack': case 'bj': return prefixBlackjack(message);
            case 'ttt': case 'tictactoe': return prefixTicTacToe(message);
            case 'slots': case 'slot': case 's': return prefixSlots(message);
            case 'reaction': case 'react': case 'r': return prefixReaction(message);
            case 'wordchain': case 'wc': return prefixWordChain(message, args);

            // ── Giveaway Commands ────────────────────────────────
            case 'gstart': case 'gs': return prefixGiveawayStart(message, args);
            case 'gend': case 'ge': return prefixGiveawayEnd(message, args);
            case 'greroll': case 'gr': return prefixGiveawayReroll(message, args);
            case 'glist': case 'gl': return prefixGiveawayList(message);
            case 'gdelete': case 'gd': return prefixGiveawayDelete(message, args);
            case 'gpause': case 'gp': return prefixGiveawayPause(message, args);
            case 'gresume': return prefixGiveawayResume(message, args);
            case 'ginfo': case 'gi': return prefixGiveawayInfo(message, args);

            // ── Help ─────────────────────────────────────────────
            case 'help': case 'h': return prefixHelp(message);
        }
    } catch (error) {
        console.error(`[Prefix] Error executing !${command}:`, error);
        message.reply('❌ An error occurred while executing this command.').catch(() => { });
    }
});

// ═══════════════════════════════════════════════════════════════════
// Prefix Command Implementations
// ═══════════════════════════════════════════════════════════════════

// ─── !help ───────────────────────────────────────────────────────

// ─── !help ───────────────────────────────────────────────────────

async function prefixHelp(message) {
    const helpCommand = require('./commands/help');
    // Adapt message to interaction-like object for code reuse
    const fakeInteraction = {
        client: message.client,
        user: message.author,
        guild: message.guild,
        channel: message.channel,
        reply: async (options) => {
            // If options is just a string, convert to object
            if (typeof options === 'string') options = { content: options };
            return message.reply(options);
        },
        editReply: async (options) => {
            // We can't edit the user's message, but we can edit our reply if we tracked it.
            // For simplicity in this adaptation, we'll just send a new message or ignore if it's complex state updates.
            // However, the help command uses createMessageComponentCollector on the response.
            // So we need to ensure the initial reply returns the message object.
        }
    };

    // The help command uses interaction.reply which returns a response object (interaction response).
    // Message.reply returns a Message object.

    // Let's rewrite a simple adapter for the help command specifically or just duplicate the logic slightly for prefix.
    // Actually, it's better to just reuse the logic but we need to handle the collector correctly.

    const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
    const categories = {
        giveaway: {
            label: 'Giveaway', description: 'Giveaway commands', emoji: '🎉', commands: [
                '`!gstart <duration> <prize>` — Start', '`!gend <id>` — End', '`!greroll <id>` — Reroll',
                '`!glist` — List', '`!gdelete <id>` — Delete', '`!gpause <id>` — Pause',
                '`!gresume <id>` — Resume', '`!ginfo <id>` — Info'
            ]
        },
        fun: {
            label: 'Fun', description: 'Mini-games', emoji: '🎮', commands: [
                '`!coinflip`, `!dice`, `!8ball`, `!rps`, `!trivia`', '`!guess`, `!wyr`, `!scramble`, `!blackjack`',
                '`!ttt`, `!slots`, `!reaction`, `!wordchain`'
            ]
        },
    };

    const homeEmbed = new EmbedBuilder()
        .setTitle('🤖  Bot Help Menu')
        .setDescription('Select a category from the dropdown menu to see commands.')
        .setColor(0x5865F2)
        .addFields({ name: '🔗 Links', value: '[Support](https://discord.gg/example) • [Invite](https://discord.com)' })
        .setFooter({ text: `Prefix: ${PREFIX}` });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`help_select_${message.id}`)
        .setPlaceholder('Select a category...')
        .addOptions(Object.entries(categories).map(([k, v]) => ({ label: v.label, description: v.description, value: k, emoji: v.emoji })));

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const reply = await message.reply({ embeds: [homeEmbed], components: [row] });

    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: '❌ Not your menu!', ephemeral: true });
        const category = categories[i.values[0]];
        const embed = new EmbedBuilder()
            .setTitle(`${category.emoji}  ${category.label}`)
            .setDescription(category.commands.join('\n'))
            .setColor(0x5865F2)
            .setFooter({ text: 'Select "Home" to go back' }); // Logic to go back could be added but simple is fine

        await i.update({ embeds: [embed] });
    });

    collector.on('end', () => reply.edit({ components: [] }).catch(() => { }));
}

// ─── !coinflip ───────────────────────────────────────────────────

async function prefixCoinflip(message, args) {
    const call = args[0]?.toLowerCase();
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const emoji = result === 'heads' ? '🪙' : '💿';

    const embed = new EmbedBuilder()
        .setTitle(`${emoji}  Coin Flip!`)
        .setColor(0xF1C40F)
        .setTimestamp();

    if (call === 'heads' || call === 'tails') {
        const won = call === result;
        embed.setDescription(`The coin landed on **${result.toUpperCase()}**!\n\nYou called **${call}** — ${won ? '🎉 **You win!**' : '😔 **You lose!**'}`);
    } else {
        embed.setDescription(`The coin landed on **${result.toUpperCase()}**! ${emoji}`);
    }

    return message.reply({ embeds: [embed] });
}

// ─── !dice ───────────────────────────────────────────────────────

async function prefixDice(message, args) {
    const sides = Math.min(100, Math.max(2, parseInt(args[0]) || 6));
    const count = Math.min(10, Math.max(1, parseInt(args[1]) || 1));

    const rolls = [];
    for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder()
        .setTitle('🎲  Dice Roll!')
        .setColor(0xE74C3C)
        .setTimestamp();

    if (count === 1) {
        embed.setDescription(`You rolled a **${rolls[0]}**! (d${sides})`);
    } else {
        embed.setDescription(`Rolling **${count}d${sides}**...\n\n🎯 Results: ${rolls.map(r => `\`${r}\``).join(' + ')}\n📊 **Total: ${total}**`);
    }

    return message.reply({ embeds: [embed] });
}

// ─── !8ball ──────────────────────────────────────────────────────

async function prefix8Ball(message, args) {
    const question = args.join(' ');
    if (!question) return message.reply('❌ You need to ask a question! Usage: `!8ball <question>`');

    const responses = [
        { text: 'It is certain.', type: 'positive' }, { text: 'Without a doubt.', type: 'positive' },
        { text: 'Yes, definitely!', type: 'positive' }, { text: 'Most likely.', type: 'positive' },
        { text: 'Outlook good.', type: 'positive' }, { text: 'Yes!', type: 'positive' },
        { text: 'Signs point to yes.', type: 'positive' },
        { text: 'Reply hazy, try again.', type: 'neutral' }, { text: 'Ask again later.', type: 'neutral' },
        { text: 'Cannot predict now.', type: 'neutral' },
        { text: "Don't count on it.", type: 'negative' }, { text: 'My reply is no.', type: 'negative' },
        { text: 'Outlook not so good.', type: 'negative' }, { text: 'Very doubtful.', type: 'negative' },
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    const colorMap = { positive: 0x2ECC71, neutral: 0xF39C12, negative: 0xE74C3C };

    const embed = new EmbedBuilder()
        .setTitle('🎱  Magic 8-Ball')
        .setDescription(`**Question:** ${question}\n\n**Answer:** ${response.text}`)
        .setColor(colorMap[response.type])
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

// ─── !rps ────────────────────────────────────────────────────────

async function prefixRPS(message, args) {
    const userChoice = args[0]?.toLowerCase();
    if (!['rock', 'paper', 'scissors'].includes(userChoice)) {
        return message.reply('❌ Choose `rock`, `paper`, or `scissors`! Usage: `!rps <choice>`');
    }

    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    const emojiMap = { rock: '🪨', paper: '📄', scissors: '✂️' };

    let result, color;
    if (userChoice === botChoice) {
        result = "🤝 It's a tie!"; color = 0xF39C12;
    } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
    ) {
        result = '🎉 You win!'; color = 0x2ECC71;
    } else {
        result = '😔 You lose!'; color = 0xE74C3C;
    }

    const embed = new EmbedBuilder()
        .setTitle('⚔️  Rock Paper Scissors')
        .setDescription(`You chose ${emojiMap[userChoice]} **${userChoice}**\nI chose ${emojiMap[botChoice]} **${botChoice}**\n\n**${result}**`)
        .setColor(color)
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

// ─── !trivia ─────────────────────────────────────────────────────

async function prefixTrivia(message) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const questions = [
        { question: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], answer: 1 },
        { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], answer: 2 },
        { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
        { question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Da Vinci', 'Picasso', 'Monet'], answer: 1 },
        { question: 'What is the chemical symbol for Gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
        { question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
        { question: 'Which element has the atomic number 1?', options: ['Helium', 'Hydrogen', 'Oxygen', 'Carbon'], answer: 1 },
        { question: 'What is the tallest mountain in the world?', options: ['K2', 'Kangchenjunga', 'Mt. Everest', 'Lhotse'], answer: 2 },
        { question: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], answer: 2 },
        { question: 'What is the currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Ringgit'], answer: 2 },
    ];

    const q = questions[Math.floor(Math.random() * questions.length)];
    const labels = ['A', 'B', 'C', 'D'];

    const embed = new EmbedBuilder()
        .setTitle('🧠  Trivia Time!')
        .setDescription([
            `**${q.question}**`, '',
            ...q.options.map((opt, i) => `${labels[i]}. ${opt}`),
            '', '⏰ You have **15 seconds** to answer!',
        ].join('\n'))
        .setColor(0x3498DB)
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        ...q.options.map((_, i) =>
            new ButtonBuilder().setCustomId(`ptrivia_${i}_${message.id}`).setLabel(labels[i]).setStyle(ButtonStyle.Secondary)
        )
    );

    const reply = await message.reply({ embeds: [embed], components: [row] });

    try {
        const collected = await reply.awaitMessageComponent({
            filter: (i) => i.user.id === message.author.id && i.customId.startsWith(`ptrivia_`) && i.customId.endsWith(message.id),
            time: 15_000,
        });

        const chosen = parseInt(collected.customId.split('_')[1]);
        const correct = chosen === q.answer;

        const disabledRow = new ActionRowBuilder().addComponents(
            ...q.options.map((_, i) =>
                new ButtonBuilder()
                    .setCustomId(`ptrivia_${i}_${message.id}`)
                    .setLabel(labels[i])
                    .setStyle(i === q.answer ? ButtonStyle.Success : (i === chosen && !correct ? ButtonStyle.Danger : ButtonStyle.Secondary))
                    .setDisabled(true)
            )
        );

        const resultEmbed = new EmbedBuilder()
            .setTitle(correct ? '✅  Correct!' : '❌  Wrong!')
            .setDescription([
                `**${q.question}**`, '',
                ...q.options.map((opt, i) => `${i === q.answer ? '✅' : (i === chosen && !correct ? '❌' : '  ')} ${labels[i]}. ${opt}`),
                '', correct ? `🎉 Great job, ${message.author}!` : `The correct answer was **${labels[q.answer]}. ${q.options[q.answer]}**`,
            ].join('\n'))
            .setColor(correct ? 0x2ECC71 : 0xE74C3C)
            .setTimestamp();

        await collected.update({ embeds: [resultEmbed], components: [disabledRow] });
    } catch {
        const disabledRow = new ActionRowBuilder().addComponents(
            ...q.options.map((_, i) =>
                new ButtonBuilder()
                    .setCustomId(`ptrivia_${i}_${message.id}`)
                    .setLabel(labels[i])
                    .setStyle(i === q.answer ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(true)
            )
        );

        const timeoutEmbed = new EmbedBuilder()
            .setTitle("⏰  Time's Up!")
            .setDescription([
                `**${q.question}**`, '',
                ...q.options.map((opt, i) => `${i === q.answer ? '✅' : '  '} ${labels[i]}. ${opt}`),
                '', `The correct answer was **${labels[q.answer]}. ${q.options[q.answer]}**`,
            ].join('\n'))
            .setColor(0x95A5A6)
            .setFooter({ text: `Prefix: ${PREFIX}` })
            .setTimestamp();

        await reply.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => { });
    }
}

// ─── !gstart <duration> <prize> ──────────────────────────────────

async function prefixGiveawayStart(message, args) {
    if (!message.member.permissions.has('ManageGuild')) {
        return message.reply('❌ You need the **Manage Server** permission to use this command.');
    }

    if (args.length < 2) {
        return message.reply('❌ Usage: `!gstart <duration> <prize>`\nExample: `!gstart 1h Nitro Classic`');
    }

    const ms = require('ms');
    const durationStr = args[0];
    const prize = args.slice(1).join(' ');

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs < 10_000) {
        return message.reply('❌ Invalid duration. Use formats like `1h`, `30m`, `1d`.');
    }

    const endsAt = Math.floor((Date.now() + durationMs) / 1000);
    const { createEntryButton } = require('./utils/embeds');

    const giveawayData = {
        guild_id: message.guildId,
        channel_id: message.channelId,
        host_id: message.author.id,
        prize,
        description: null,
        winner_count: 1,
        required_role_id: null,
        ends_at: endsAt,
    };

    const embed = createGiveawayEmbed(giveawayData, 0);
    const buttonRow = createEntryButton();
    const giveawayMessage = await message.channel.send({ embeds: [embed], components: [buttonRow] });
    await giveawayMessage.react(EMOJI);

    db.createGiveaway({
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: giveawayMessage.id,
        hostId: message.author.id,
        prize,
        description: null,
        winnerCount: 1,
        requiredRoleId: null,
        endsAt,
    });

    const saved = db.getGiveaway(giveawayMessage.id);
    const updatedEmbed = createGiveawayEmbed(saved, 0);
    await giveawayMessage.edit({ embeds: [updatedEmbed], components: [buttonRow] });

    await message.reply(`✅ Giveaway started! Prize: **${prize}**`);
}

// ─── !gend <message_id> ─────────────────────────────────────────

async function prefixGiveawayEnd(message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.reply('❌ You need **Manage Server** permission.');
    if (!args[0]) return message.reply('❌ Usage: `!gend <message_id>`');

    const { finishGiveaway } = require('./utils/timer');
    const giveaway = db.getGiveaway(args[0]);
    if (!giveaway) return message.reply('❌ Giveaway not found.');
    if (giveaway.guild_id !== message.guildId) return message.reply('❌ That giveaway does not belong to this server.');
    if (giveaway.ended) return message.reply('❌ That giveaway has already ended.');

    await finishGiveaway(message.client, giveaway);
    await message.reply(`✅ Giveaway for **${giveaway.prize}** has been ended!`);
}

// ─── !greroll <message_id> [count] ───────────────────────────────

async function prefixGiveawayReroll(message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.reply('❌ You need **Manage Server** permission.');
    if (!args[0]) return message.reply('❌ Usage: `!greroll <message_id> [winner_count]`');

    const { pickWinners } = require('./utils/timer');
    const { createEndedEmbed, createWinnerAnnouncementEmbed } = require('./utils/embeds');
    const giveaway = db.getGiveaway(args[0]);
    if (!giveaway) return message.reply('❌ Giveaway not found.');
    if (!giveaway.ended) return message.reply('❌ That giveaway is still active. Use `!gend` first.');

    const winnerCount = parseInt(args[1]) || giveaway.winner_count;
    const participants = db.getParticipantUserIds(giveaway.id);
    if (participants.length === 0) return message.reply('❌ No participants — cannot reroll.');

    const newWinners = pickWinners(participants, winnerCount);

    try {
        const channel = await message.guild.channels.fetch(giveaway.channel_id);
        const msg = await channel.messages.fetch(giveaway.message_id);
        await msg.edit({ embeds: [createEndedEmbed(giveaway, newWinners, participants.length)], components: [] });
    } catch { }

    const embed = createWinnerAnnouncementEmbed(giveaway, newWinners);
    await message.reply({ content: `🎉 New winners: ${newWinners.map(id => `<@${id}>`).join(', ')}`, embeds: [embed] });
}

// ─── !glist ──────────────────────────────────────────────────────

async function prefixGiveawayList(message) {
    if (!message.member.permissions.has('ManageGuild')) return message.reply('❌ You need **Manage Server** permission.');
    const { formatTimestamp } = require('./utils/embeds');
    const giveaways = db.getActiveGiveaways(message.guildId);

    if (giveaways.length === 0) return message.reply('✅ No active giveaways in this server.');

    const lines = giveaways.map((g, i) => {
        const count = db.getParticipantCount(g.id);
        const status = g.paused ? '⏸️ Paused' : '🟢 Active';
        return `**${i + 1}. ${g.prize}** — ${status}\n   📥 ${count} entries • ⏰ Ends ${formatTimestamp(g.ends_at)}`;
    });

    const embed = new EmbedBuilder()
        .setTitle('📋  Active Giveaways')
        .setDescription(lines.join('\n\n'))
        .setColor(0x5865F2)
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

// ─── !gdelete, !gpause, !gresume, !ginfo ─────────────────────────

async function prefixGiveawayDelete(message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.reply('❌ You need **Manage Server** permission.');
    if (!args[0]) return message.reply('❌ Usage: `!gdelete <message_id>`');

    const giveaway = db.getGiveaway(args[0]);
    if (!giveaway) return message.reply('❌ Giveaway not found.');
    if (giveaway.guild_id !== message.guildId) return message.reply('❌ That giveaway does not belong to this server.');

    try {
        const channel = await message.guild.channels.fetch(giveaway.channel_id);
        const msg = await channel.messages.fetch(giveaway.message_id);
        await msg.delete();
    } catch { }

    db.deleteGiveaway(args[0]);
    return message.reply(`✅ Giveaway for **${giveaway.prize}** has been deleted.`);
}

async function prefixGiveawayPause(message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.reply('❌ You need **Manage Server** permission.');
    if (!args[0]) return message.reply('❌ Usage: `!gpause <message_id>`');

    const { createPausedEmbed, createEntryButton } = require('./utils/embeds');
    const giveaway = db.getGiveaway(args[0]);
    if (!giveaway) return message.reply('❌ Giveaway not found.');
    if (giveaway.ended) return message.reply('❌ That giveaway has already ended.');
    if (giveaway.paused) return message.reply('❌ That giveaway is already paused.');

    db.pauseGiveaway(args[0]);

    try {
        const channel = await message.guild.channels.fetch(giveaway.channel_id);
        const msg = await channel.messages.fetch(giveaway.message_id);
        const count = db.getParticipantCount(giveaway.id);
        await msg.edit({ embeds: [createPausedEmbed(giveaway, count)], components: [createEntryButton(true)] });
    } catch { }

    return message.reply(`⏸️ Giveaway for **${giveaway.prize}** has been paused.`);
}

async function prefixGiveawayResume(message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.reply('❌ You need **Manage Server** permission.');
    if (!args[0]) return message.reply('❌ Usage: `!gresume <message_id>`');

    const { createEntryButton } = require('./utils/embeds');
    const giveaway = db.getGiveaway(args[0]);
    if (!giveaway) return message.reply('❌ Giveaway not found.');
    if (giveaway.ended) return message.reply('❌ That giveaway has already ended.');
    if (!giveaway.paused) return message.reply('❌ That giveaway is not paused.');

    db.resumeGiveaway(args[0]);

    try {
        const channel = await message.guild.channels.fetch(giveaway.channel_id);
        const msg = await channel.messages.fetch(giveaway.message_id);
        const count = db.getParticipantCount(giveaway.id);
        const updated = db.getGiveaway(args[0]);
        await msg.edit({ embeds: [createGiveawayEmbed(updated, count)], components: [createEntryButton()] });
    } catch { }

    return message.reply(`▶️ Giveaway for **${giveaway.prize}** has been resumed!`);
}

async function prefixGiveawayInfo(message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.reply('❌ You need **Manage Server** permission.');
    if (!args[0]) return message.reply('❌ Usage: `!ginfo <message_id>`');

    const { createInfoStatsEmbed } = require('./utils/embeds');
    const giveaway = db.getGiveaway(args[0]);
    if (!giveaway) return message.reply('❌ Giveaway not found.');
    if (giveaway.guild_id !== message.guildId) return message.reply('❌ That giveaway does not belong to this server.');

    const count = db.getParticipantCount(giveaway.id);
    const total = db.getTotalEntries(giveaway.id);
    return message.reply({ embeds: [createInfoStatsEmbed(giveaway, count, total)] });
}

// ═══════════════════════════════════════════════════════════════════
// New Prefix Game Implementations
// ═══════════════════════════════════════════════════════════════════

// ─── !guess ──────────────────────────────────────────────────────

async function prefixGuess(message) {
    const target = Math.floor(Math.random() * 100) + 1;
    let attempts = 0;
    const maxAttempts = 7;

    await message.reply({ embeds: [new EmbedBuilder().setTitle('🔢  Number Guessing Game').setDescription(`I'm thinking of a number between **1** and **100**.\n\n🎯 You have **${maxAttempts} attempts**. Type your guess!`).setColor(0x3498DB)] });

    const filter = (m) => m.author.id === message.author.id && !isNaN(m.content) && parseInt(m.content) >= 1 && parseInt(m.content) <= 100;
    const collector = message.channel.createMessageCollector({ filter, time: 60_000, max: maxAttempts });

    collector.on('collect', (msg) => {
        attempts++;
        const guess = parseInt(msg.content);
        if (guess === target) {
            msg.reply({ embeds: [new EmbedBuilder().setTitle('🎉  You Got It!').setDescription(`The number was **${target}**!\n🏆 Guessed in **${attempts}** attempt${attempts !== 1 ? 's' : ''}!`).setColor(0x2ECC71)] });
            collector.stop('won');
        } else if (attempts >= maxAttempts) {
            msg.reply({ embeds: [new EmbedBuilder().setTitle('💀  Game Over!').setDescription(`The number was **${target}**.`).setColor(0xE74C3C)] });
            collector.stop('lost');
        } else {
            const hint = guess > target ? '📉 **Lower!**' : '📈 **Higher!**';
            msg.reply(`${hint} (${maxAttempts - attempts} left)`);
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') message.channel.send({ embeds: [new EmbedBuilder().setTitle('⏰  Time\'s Up!').setDescription(`The number was **${target}**.`).setColor(0x95A5A6)] });
    });
}

// ─── !wyr ────────────────────────────────────────────────────────

async function prefixWYR(message) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const wyrOptions = [
        ['Be able to fly', 'Be able to read minds'], ['Live without music', 'Live without movies'],
        ['Have unlimited money', 'Have unlimited time'], ['Be invisible', 'Be able to teleport'],
        ['Know every language', 'Play every instrument'], ['Have super strength', 'Have super speed'],
        ['Be famous', 'Be the smartest person alive'], ['Have a pet dragon', 'Have a pet unicorn'],
        ['Live on the moon', 'Live underwater'], ['Have x-ray vision', 'Have night vision'],
    ];
    const wyr = wyrOptions[Math.floor(Math.random() * wyrOptions.length)];
    const uid = Date.now().toString(36);

    const embed = new EmbedBuilder().setTitle('🤔  Would You Rather?')
        .setDescription(`**🅰️** ${wyr[0]}\n\n**OR**\n\n**🅱️** ${wyr[1]}`)
        .setColor(0x9B59B6).setFooter({ text: 'Vote within 30 seconds!' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`wyr_a_${uid}`).setLabel('A').setEmoji('🅰️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`wyr_b_${uid}`).setLabel('B').setEmoji('🅱️').setStyle(ButtonStyle.Danger),
    );

    const reply = await message.reply({ embeds: [embed], components: [row] });
    const votes = { a: 0, b: 0 };
    const voters = new Set();

    const collector = reply.createMessageComponentCollector({ filter: (i) => i.customId.endsWith(uid), time: 30_000 });
    collector.on('collect', async (i) => {
        if (voters.has(i.user.id)) return i.reply({ content: 'Already voted!', ephemeral: true });
        voters.add(i.user.id);
        votes[i.customId.startsWith('wyr_a') ? 'a' : 'b']++;
        await i.reply({ content: '✅ Voted!', ephemeral: true });
    });
    collector.on('end', async () => {
        const total = votes.a + votes.b;
        const pctA = total > 0 ? Math.round((votes.a / total) * 100) : 0;
        const pctB = total > 0 ? Math.round((votes.b / total) * 100) : 0;
        const resultEmbed = new EmbedBuilder().setTitle('🤔  Would You Rather — Results')
            .setDescription(`**🅰️** ${wyr[0]} — **${pctA}%** (${votes.a})\n\n**🅱️** ${wyr[1]} — **${pctB}%** (${votes.b})\n\n📊 Total: **${total}**`)
            .setColor(0x9B59B6);
        await reply.edit({ embeds: [resultEmbed], components: [] }).catch(() => { });
    });
}

// ─── !scramble ───────────────────────────────────────────────────

async function prefixScramble(message) {
    const words = [
        { word: 'DISCORD', hint: 'A chat platform' }, { word: 'JAVASCRIPT', hint: 'A programming language' },
        { word: 'GIVEAWAY', hint: 'Free stuff!' }, { word: 'KEYBOARD', hint: 'You type on it' },
        { word: 'COMPUTER', hint: 'A machine for work and games' }, { word: 'INTERNET', hint: 'Connects the world' },
        { word: 'ELEPHANT', hint: 'Largest land animal' }, { word: 'TREASURE', hint: 'Pirates search for it' },
        { word: 'DINOSAUR', hint: 'Extinct reptile' }, { word: 'CHAMPION', hint: 'The winner' },
    ];
    const wordData = words[Math.floor(Math.random() * words.length)];
    const scrambled = wordData.word.split('').sort(() => Math.random() - 0.5).join('');

    await message.reply({ embeds: [new EmbedBuilder().setTitle('🔤  Word Scramble!').setDescription(`Unscramble this word:\n\n## \`${scrambled}\`\n\n💡 Hint: *${wordData.hint}*\n\n⏰ **30 seconds**! Type your answer.`).setColor(0xE67E22)] });

    const collector = message.channel.createMessageCollector({ filter: (m) => m.author.id === message.author.id, time: 30_000 });
    collector.on('collect', (msg) => {
        if (msg.content.toUpperCase() === wordData.word) {
            msg.reply({ embeds: [new EmbedBuilder().setTitle('🎉  Correct!').setDescription(`The word was **${wordData.word}**!`).setColor(0x2ECC71)] });
            collector.stop('won');
        } else msg.reply('❌ Not quite! Try again...');
    });
    collector.on('end', (_, reason) => {
        if (reason === 'time') message.channel.send({ embeds: [new EmbedBuilder().setTitle('⏰  Time\'s Up!').setDescription(`The word was **${wordData.word}**.`).setColor(0x95A5A6)] });
    });
}

// ─── !blackjack ──────────────────────────────────────────────────

async function prefixBlackjack(message) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const draw = () => ({ suit: suits[Math.floor(Math.random() * 4)], value: values[Math.floor(Math.random() * 13)] });
    const handVal = (h) => { let t = 0, a = 0; for (const c of h) { if (c.value === 'A') { t += 11; a++; } else if ('KQJ'.includes(c.value)) t += 10; else t += parseInt(c.value); } while (t > 21 && a > 0) { t -= 10; a--; } return t; };
    const handStr = (h) => h.map(c => `\`${c.value}${c.suit}\``).join(' ');

    const playerHand = [draw(), draw()];
    const dealerHand = [draw(), draw()];
    const uid = Date.now().toString(36);

    function buildEmbed(showDealer = false) {
        const pv = handVal(playerHand);
        return new EmbedBuilder().setTitle('🃏  Blackjack')
            .setDescription(`**Dealer** (${showDealer ? handVal(dealerHand) : '?'})\n${showDealer ? handStr(dealerHand) : `${dealerHand[0].value}${dealerHand[0].suit} \`??\``}\n\n**You** (${pv})\n${handStr(playerHand)}`)
            .setColor(pv > 21 ? 0xE74C3C : 0x2ECC71);
    }

    if (handVal(playerHand) === 21) {
        return message.reply({ embeds: [buildEmbed(true).setTitle('🃏  Blackjack — 🎉 BLACKJACK!')] });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('Stand').setEmoji('🛑').setStyle(ButtonStyle.Danger),
    );

    const reply = await message.reply({ embeds: [buildEmbed()], components: [row] });
    const collector = reply.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id && i.customId.endsWith(uid), time: 60_000 });

    collector.on('collect', async (i) => {
        if (i.customId.startsWith('bj_hit')) {
            playerHand.push(draw());
            if (handVal(playerHand) > 21) {
                await i.update({ embeds: [buildEmbed(true).setTitle('🃏  Blackjack — 💥 BUST!').setColor(0xE74C3C)], components: [] });
                collector.stop();
            } else if (handVal(playerHand) === 21) {
                await finishBJ(i);
                collector.stop();
            } else {
                await i.update({ embeds: [buildEmbed()], components: [row] });
            }
        } else {
            await finishBJ(i);
            collector.stop();
        }
    });

    async function finishBJ(i) {
        while (handVal(dealerHand) < 17) dealerHand.push(draw());
        const pv = handVal(playerHand), dv = handVal(dealerHand);
        let result, color;
        if (dv > 21) { result = '🎉 Dealer busts! You win!'; color = 0x2ECC71; }
        else if (pv > dv) { result = '🎉 You win!'; color = 0x2ECC71; }
        else if (pv < dv) { result = '😔 Dealer wins!'; color = 0xE74C3C; }
        else { result = "🤝 Push (tie)!"; color = 0xF39C12; }
        const e = buildEmbed(true); e.setDescription(e.data.description + `\n\n**${result}**`).setColor(color);
        await i.update({ embeds: [e], components: [] });
    }
}

// ─── !ttt ────────────────────────────────────────────────────────

async function prefixTicTacToe(message) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const playerX = message.author;
    const playerO = message.client.user;
    const uid = Date.now().toString(36);
    const board = Array(9).fill(null);
    let currentTurn = 'X';

    const emojis = { X: '❌', O: '⭕' };
    function buildBoard() {
        const rows = [];
        for (let r = 0; r < 3; r++) {
            const row = new ActionRowBuilder();
            for (let c = 0; c < 3; c++) {
                const idx = r * 3 + c;
                const btn = new ButtonBuilder().setCustomId(`ttt_${idx}_${uid}`).setLabel(board[idx] ? ' ' : `${idx + 1}`)
                    .setStyle(board[idx] === 'X' ? ButtonStyle.Danger : board[idx] === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(board[idx] !== null);
                if (board[idx]) btn.setEmoji(emojis[board[idx]]);
                row.addComponents(btn);
            }
            rows.push(row);
        }
        return rows;
    }

    function checkWinner() {
        const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        return board.every(c => c !== null) ? 'draw' : null;
    }

    function botMove() {
        const empty = board.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
        if (empty.includes(4)) return 4;
        const corners = [0, 2, 6, 8].filter(i => empty.includes(i));
        if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
        return empty[Math.floor(Math.random() * empty.length)];
    }

    const embed = new EmbedBuilder().setTitle('❌⭕  Tic-Tac-Toe')
        .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\nYour turn! (❌)`).setColor(0x3498DB);

    const reply = await message.reply({ embeds: [embed], components: buildBoard() });
    const collector = reply.createMessageComponentCollector({ filter: (i) => i.user.id === playerX.id && i.customId.endsWith(uid), time: 120_000 });

    collector.on('collect', async (i) => {
        const idx = parseInt(i.customId.split('_')[1]);
        if (board[idx]) return i.reply({ content: 'Taken!', ephemeral: true });
        board[idx] = 'X';
        let winner = checkWinner();
        if (!winner) { board[botMove()] = 'O'; winner = checkWinner(); }

        if (winner) {
            let rt = winner === 'draw' ? "🤝 Draw!" : `🏆 ${winner === 'X' ? playerX.username : playerO.username} wins!`;
            const fe = new EmbedBuilder().setTitle('❌⭕  Tic-Tac-Toe — Game Over').setDescription(rt).setColor(winner === 'draw' ? 0xF39C12 : 0x2ECC71);
            const db2 = buildBoard().map(r => { r.components.forEach(b => b.setDisabled(true)); return r; });
            await i.update({ embeds: [fe], components: db2 }); collector.stop();
        } else {
            await i.update({ embeds: [new EmbedBuilder().setTitle('❌⭕  Tic-Tac-Toe').setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\nYour turn! (❌)`).setColor(0x3498DB)], components: buildBoard() });
        }
    });
}

// ─── !slots ──────────────────────────────────────────────────────

async function prefixSlots(message) {
    const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎', '7️⃣'];
    const weights = [25, 20, 18, 15, 12, 7, 3];
    const totalW = weights.reduce((a, b) => a + b, 0);
    const pick = () => { let r = Math.random() * totalW; for (let i = 0; i < symbols.length; i++) { r -= weights[i]; if (r <= 0) return symbols[i]; } return symbols[0]; };

    const r1 = [pick(), pick(), pick()], r2 = [pick(), pick(), pick()], r3 = [pick(), pick(), pick()];
    const allMatch = r2[0] === r2[1] && r2[1] === r2[2];
    const twoMatch = r2[0] === r2[1] || r2[1] === r2[2] || r2[0] === r2[2];

    let result, color;
    if (allMatch) { result = `🎰 **THREE ${r2[0]}!** Big Win!`; color = 0x2ECC71; }
    else if (twoMatch) { result = '🎰 **Two matching!** Small win!'; color = 0xF39C12; }
    else { result = '🎰 No match. Try again!'; color = 0x95A5A6; }

    const display = `┌──────────────┐\n│ ${r1.join(' │ ')} │\n├──────────────┤\n│ ${r2.join(' │ ')} │ ◀\n├──────────────┤\n│ ${r3.join(' │ ')} │\n└──────────────┘`;
    return message.reply({ embeds: [new EmbedBuilder().setTitle('🎰  Slot Machine').setDescription(`${display}\n\n${result}`).setColor(color)] });
}

// ─── !reaction ───────────────────────────────────────────────────

async function prefixReaction(message) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const uid = Date.now().toString(36);
    const waitTime = Math.floor(Math.random() * 4000) + 2000;

    const waitRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`react_wait_${uid}`).setLabel('Wait...').setStyle(ButtonStyle.Danger).setDisabled(true)
    );
    const reply = await message.reply({ embeds: [new EmbedBuilder().setTitle('⚡  Reaction Speed Test').setDescription('🔴 Wait for it...\n\nClick the button when it turns **green**!').setColor(0xE74C3C)], components: [waitRow] });

    await new Promise(resolve => setTimeout(resolve, waitTime));

    const goRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`react_go_${uid}`).setLabel('CLICK!').setEmoji('⚡').setStyle(ButtonStyle.Success)
    );
    const goTime = Date.now();
    await reply.edit({ embeds: [new EmbedBuilder().setTitle('⚡  Reaction Speed Test').setDescription('🟢 **NOW! CLICK IT!**').setColor(0x2ECC71)], components: [goRow] });

    try {
        const collected = await reply.awaitMessageComponent({ filter: (i) => i.user.id === message.author.id && i.customId === `react_go_${uid}`, time: 10_000 });
        const rt = Date.now() - goTime;
        let rating;
        if (rt < 200) rating = '🏆 **INSANE!**'; else if (rt < 350) rating = '⚡ **Lightning fast!**';
        else if (rt < 500) rating = '🔥 **Very fast!**'; else if (rt < 700) rating = '👍 **Pretty good!**';
        else if (rt < 1000) rating = '😐 **Average**'; else rating = '🐢 **A bit slow...**';
        await collected.update({ embeds: [new EmbedBuilder().setTitle('⚡  Result').setDescription(`⏱️ **${rt}ms**\n\n${rating}`).setColor(rt < 500 ? 0x2ECC71 : rt < 1000 ? 0xF39C12 : 0xE74C3C)], components: [] });
    } catch {
        await reply.edit({ embeds: [new EmbedBuilder().setTitle('⏰  Too Slow!').setColor(0x95A5A6)], components: [] }).catch(() => { });
    }
}

// ─── !wordchain ──────────────────────────────────────────────────

async function prefixWordChain(message, args) {
    const channelId = message.channel.id;
    const existingGame = activeChainGames.get(channelId);

    // Check for stop command
    if (args && args[0]?.toLowerCase() === 'stop') {
        if (existingGame) {
            existingGame.stop();
            activeChainGames.delete(channelId);
            return message.reply('🛑 Word Chain game stopped.');
        } else {
            return message.reply('❌ No Word Chain game is currently active in this channel.');
        }
    }

    if (existingGame) {
        return message.reply('⚠️ A Word Chain game is already active in this channel! Use `!wc stop` to end it.');
    }

    const chain = [];
    let lastLetter = null;
    let lastUserId = null;
    const usedWords = new Set();
    const players = new Set();
    let wordCount = 0;

    await message.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🔗  Word Chain!')
            .setDescription('**Rules:** Type a word starting with the **last letter** of the previous word.\nNo repeats • Min 2 letters • No same user twice in a row\n\n🟢 **Type any word to start!**\nUse `!wc stop` to end the game manually.')
            .setColor(0x3498DB)]
    });

    const filter = (m) => !m.author.bot && /^[a-zA-Z]{2,}$/.test(m.content.trim());
    const collector = message.channel.createMessageCollector({ filter });

    collector.on('collect', (msg) => {
        const word = msg.content.trim().toLowerCase();
        if (lastLetter && word[0] !== lastLetter) { msg.reply(`❌ Must start with **${lastLetter.toUpperCase()}**!`); return; }
        if (usedWords.has(word)) { msg.reply('❌ Already used!'); return; }
        if (lastUserId && msg.author.id === lastUserId) { msg.reply('❌ You can\'t go twice in a row! Let someone else answer.'); return; }

        usedWords.add(word);
        lastLetter = word[word.length - 1];
        lastUserId = msg.author.id;
        wordCount++;
        players.add(msg.author.id);
        chain.push({ word, user: msg.author.username });
        msg.react('✅').catch(() => { });
        collector.resetTimer({ idle: 15_000 });

        if (wordCount % 5 === 0) {
            const last5 = chain.slice(-5).map(c => `**${c.word}** (${c.user})`).join(' → ');
            msg.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`🔗 Chain: ${wordCount} words!`)
                    .setDescription(`${last5}\n\nNext letter: **${lastLetter.toUpperCase()}**`)
                    .setColor(0x2ECC71).setFooter({ text: '15s to answer!' })]
            });
        }
    });



    collector.on('end', (collected, reason) => {
        activeChainGames.delete(channelId);
        if (reason === 'user') return; // Handled by stop command

        const lastWords = chain.slice(-10).map(c => `**${c.word}**`).join(' → ');
        const rating = wordCount >= 20 ? '🏆 **Amazing!**' : wordCount >= 10 ? '🔥 **Great!**' : wordCount >= 5 ? '👍 **Not bad!**' : '💪 **Try again!**';
        message.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('🔗  Word Chain — Game Over!')
                .setDescription(`⏰ No one answered in time!\n\n📊 **${wordCount}** words • **${players.size}** player(s)\n\n${wordCount > 0 ? `🔗 ${lastWords}\n\n` : ''}${rating}`)
                .setColor(0xF39C12)]
        });
    });

    activeChainGames.set(channelId, collector);
}


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
    console.log(`║  Prefix:       ${PREFIX.padEnd(29)}║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    await db.getDb();
    console.log('💾 Database initialized');

    startTimer(client);

    const { ActivityType } = require('discord.js');
    readyClient.user.setActivity(`${PREFIX}help | /giveaway`, { type: ActivityType.Listening });
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
