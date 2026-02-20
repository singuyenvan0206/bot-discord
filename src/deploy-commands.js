require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in .env file');
    process.exit(1);
}

// ─── Define All Slash Commands ───────────────────────────────────

const commands = [
    // ═══ Fun & Games ═══
    new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play Blackjack against the dealer!')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet (default: 50)').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('poker')
        .setDescription('Texas Hold\'em Poker (Multiplayer)')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin — heads or tails!')
        .addStringOption(opt => opt.setName('choice').setDescription('Heads or Tails').setRequired(true).addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' }))
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet (default: 50)').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll the dice!')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Spin the slot machine!')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet (default: 50)').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('minesweeper')
        .setDescription('Play Minesweeper! (24 Cells)')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Rock Paper Scissors'),

    new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Play Tic-Tac-Toe against another player'),

    new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Test your knowledge with trivia!'),

    new SlashCommandBuilder()
        .setName('emojiquiz')
        .setDescription('Guess the answer from emoji clues!'),

    new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Play Hangman — guess the word!'),

    new SlashCommandBuilder()
        .setName('scramble')
        .setDescription('Unscramble the word!'),

    new SlashCommandBuilder()
        .setName('wordchain')
        .setDescription('Multiplayer Word Chain game'),

    new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Guess the number!'),

    new SlashCommandBuilder()
        .setName('reaction')
        .setDescription('Test your reaction speed!'),

    // ═══ Economy ═══
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your or another user\'s balance')
        .addUserOption(opt => opt.setName('user').setDescription('User to check (optional)')),

    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward'),

    new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Go fishing to earn coins (Requires Fishing Rod)'),

    new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn money'),

    new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Send coins to another user')
        .addUserOption(opt => opt.setName('user').setDescription('User to send coins to').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to send').setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse the item shop'),

    new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buy an item from the shop')
        .addStringOption(opt => opt.setName('item').setDescription('Item ID to buy (e.g. laptop)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory'),

    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the richest users'),

    // ═══ Utility ═══
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and status'),

    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('View a user\'s avatar')
        .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),

    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('View server statistics'),

    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('View user information')
        .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands')
        .addStringOption(opt => opt.setName('command').setDescription('Get details for a specific command')),

    // ═══ Giveaway ═══
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .addSubcommand(sub => sub
            .setName('start')
            .setDescription('Start a new giveaway')
            .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d)').setRequired(true))
            .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1))
            .addStringOption(opt => opt.setName('prize').setDescription('Prize description').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('end')
            .setDescription('End a giveaway immediately')
            .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('reroll')
            .setDescription('Reroll a giveaway winner')
            .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List active giveaways')
        )
        .addSubcommand(sub => sub
            .setName('pause')
            .setDescription('Pause a giveaway')
            .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('resume')
            .setDescription('Resume a paused giveaway')
            .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('delete')
            .setDescription('Delete a giveaway')
            .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        ),
    new SlashCommandBuilder()
        .setName('language')
        .setDescription('Set the language for you or the server')
        .addStringOption(opt => opt.setName('choice').setDescription('Language choice (en/vi)').setRequired(true).addChoices({ name: 'English', value: 'en' }, { name: 'Tiếng Việt', value: 'vi' }))
        .addStringOption(opt => opt.setName('scope').setDescription('Apply to (user/server)').addChoices({ name: 'Personal (User)', value: 'user' }, { name: 'Default (Server Admin)', value: 'server' })),
].map(cmd => cmd.toJSON());

// ─── Register Commands ───────────────────────────────────────────

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`🔄 Registering ${commands.length} slash commands...`);

        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Successfully registered ${data.length} slash commands!`);
        console.log('📋 Commands:', data.map(c => `/${c.name}`).join(', '));
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
})();
