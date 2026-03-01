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
        .setDescription('Rock Paper Scissors')
        .addStringOption(opt => opt.setName('choice').setDescription('Rock, Paper, or Scissors').addChoices({ name: 'Rock', value: 'rock' }, { name: 'Paper', value: 'paper' }, { name: 'Scissors', value: 'scissors' }))
        .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet (default: 50)').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Play Tic-Tac-Toe against another player')
        .addUserOption(opt => opt.setName('opponent').setDescription('User to play against (optional)')),

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
        .addStringOption(opt => opt.setName('item').setDescription('Item ID or name').setRequired(true))
        .addStringOption(opt => opt.setName('quantity').setDescription('Quantity to buy (e.g. 1, 5, max, all)')),

    new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory')
        .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),



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

    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View yours or another user\'s profile')
        .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),

    new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View the global/server leaderboards')
        .addStringOption(opt => opt.setName('type').setDescription('Leaderboard type').addChoices(
            { name: 'Balance', value: 'balance' },
            { name: 'XP', value: 'xp' }
        )),



    new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Beg for some coins'),

    new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Commit a crime for high rewards (risky)'),

    new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for coins in random locations'),

    new SlashCommandBuilder()
        .setName('slut')
        .setDescription('Go out and earn some quick coins (risky)'),

    new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Steal coins from another user')
        .addUserOption(opt => opt.setName('target').setDescription('Target user to rob').setRequired(true)),

    new SlashCommandBuilder()
        .setName('use')
        .setDescription('Use an item from your inventory')
        .addStringOption(opt => opt.setName('item').setDescription('Item name to use').setRequired(true)),

    new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Sell an item back to the shop')
        .addStringOption(opt => opt.setName('item').setDescription('Item ID or name').setRequired(true))
        .addIntegerOption(opt => opt.setName('quantity').setDescription('Amount to sell').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('job')
        .setDescription('Manage your career')
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('View all available jobs')
        )
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('View your current job status')
        )
        .addSubcommand(sub => sub
            .setName('set')
            .setDescription('Switch to a new career')
            .addStringOption(opt => opt.setName('id').setDescription('Job ID (e.g. farmer, programmer)').setRequired(true))
        ),

    new SlashCommandBuilder()
        .setName('jobdetail')
        .setDescription('View detailed information about a job')
        .addStringOption(opt => opt.setName('id').setDescription('Job name/ID').setRequired(true)),

    new SlashCommandBuilder()
        .setName('iteminfo')
        .setDescription('View detailed info about an item')
        .addStringOption(opt => opt.setName('id').setDescription('Item ID or name').setRequired(true)),

    new SlashCommandBuilder()
        .setName('connect4')
        .setDescription('Challenge someone to Connect 4')
        .addUserOption(opt => opt.setName('opponent').setDescription('Opponent to play with').setRequired(true))
        .addIntegerOption(opt => opt.setName('bet').setDescription('Bet amount').setMinValue(1)),

    new SlashCommandBuilder()
        .setName('memory')
        .setDescription('Play the Memory Match game')
        .addIntegerOption(opt => opt.setName('bet').setDescription('Bet amount').setMinValue(1)),

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
    new SlashCommandBuilder()
        .setName('setdistchannel')
        .setDescription('Kênh chia tiền (Set distribution channel)')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to set (optional - leave blank to unset)')),
    new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('Cài đặt role vào Shop cho server này')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Thêm role vào shop')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
            .addIntegerOption(opt => opt.setName('price').setDescription('Price').setRequired(true))
            .addIntegerOption(opt => opt.setName('income').setDescription('Income buff % (optional)'))
            .addIntegerOption(opt => opt.setName('xp').setDescription('XP buff % (optional)'))
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Xóa role khỏi shop')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('updateid')
            .setDescription('Thay đổi ID role trong shop')
            .addStringOption(opt => opt.setName('old_id').setDescription('ID cũ của role trong shop').setRequired(true))
            .addRoleOption(opt => opt.setName('new_role').setDescription('Role mới muốn thay thế').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('Xem danh sách role trong shop')
        ),
    new SlashCommandBuilder()
        .setName('buyrole')
        .setDescription('Mua phẩm hàm (Buy roles)'),
    new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('Xổ số (Participate in lottery)')
        .addStringOption(opt => opt.setName('action').setDescription('Action (e.g. buy)').addChoices({ name: 'Buy Tickets', value: 'buy' }))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of tickets to buy').setMinValue(1)),
    new SlashCommandBuilder()
        .setName('additem')
        .setDescription('Thêm vật phẩm cho người dùng (Add item to user)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(opt => opt.setName('item').setDescription('Item name/ID').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),
    new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Thêm tiền cho người dùng (Add money to user)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),
    new SlashCommandBuilder()
        .setName('leaveserver')
        .setDescription('Rời khỏi server (Leave a server)')
        .addStringOption(opt => opt.setName('id').setDescription('Server ID').setRequired(true)),
    new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Trừ tiền của người dùng (Remove money from user)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),
    new SlashCommandBuilder()
        .setName('resetdatabase')
        .setDescription('Đặt lại toàn bộ database (Reset entire database)')
        .addStringOption(opt => opt.setName('confirm').setDescription('Type YES to confirm').setRequired(true)),
    new SlashCommandBuilder()
        .setName('resetuser')
        .setDescription('Đặt lại dữ liệu của một người dùng (Reset a user\'s data)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(opt => opt.setName('confirm').setDescription('Type confirm to proceed').setRequired(true)),
    new SlashCommandBuilder()
        .setName('serverlist')
        .setDescription('Danh sách server bot đang tham gia (List all servers)')
        .addIntegerOption(opt => opt.setName('page').setDescription('Page number')),
    new SlashCommandBuilder()
        .setName('setexp')
        .setDescription('Đặt điểm kinh nghiệm cho người dùng (Set XP for user)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),
    new SlashCommandBuilder()
        .setName('setlevel')
        .setDescription('Đặt cấp độ cho người dùng (Set level for user)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption(opt => opt.setName('level').setDescription('Level').setRequired(true)),
    new SlashCommandBuilder()
        .setName('setowner')
        .setDescription('[OWNER] Chuyển quyền Owner (Transfer bot ownership)')
        .addUserOption(opt => opt.setName('user').setDescription('New owner').setRequired(true)),
    new SlashCommandBuilder()
        .setName('setstatus')
        .setDescription('Đặt trạng thái cho bot (Set bot status activity)')
        .addStringOption(opt => opt.setName('type').setDescription('Type (playing, watching, listening, competing)').setRequired(true))
        .addStringOption(opt => opt.setName('text').setDescription('Status text').setRequired(true)),
    new SlashCommandBuilder()
        .setName('shutdown')
        .setDescription('Tắt bot (Shutdown the bot)'),
    new SlashCommandBuilder()
        .setName('startup')
        .setDescription('[OWNER] Khởi động lại hệ thống lệnh (Re-enable command system)'),
    new SlashCommandBuilder()
        .setName('update')
        .setDescription('Cập nhật bot từ GitHub (Update bot from GitHub)'),
    new SlashCommandBuilder()
        .setName('divorce')
        .setDescription('Ly hôn (Divorce)'),
    new SlashCommandBuilder()
        .setName('gift')
        .setDescription('Tặng quà (Send a gift)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(opt => opt.setName('item').setDescription('Item ID/Name').setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),
    new SlashCommandBuilder()
        .setName('marriage')
        .setDescription('Hôn nhân (Marriage info)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user (optional)')),
    new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Kết hôn (Propose to someone)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder()
        .setName('level')
        .setDescription('Cấp độ (View level)')
        .addUserOption(opt => opt.setName('user').setDescription('Target user (optional)')),
    new SlashCommandBuilder()
        .setName('support')
        .setDescription('Ủng hộ (Support developer)'),
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
