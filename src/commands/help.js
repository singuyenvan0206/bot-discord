const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

const categories = {
    fun: {
        label: 'Fun & Games',
        description: 'Mini-games and activities',
        emoji: '🎮',
        commands: [
            '`$coinflip` (`$cf`, `$flip`) — Flip a coin',
            '`$dice` (`$roll`) — Roll dice',
            '`$rps` (`$rock`) — Rock Paper Scissors',
            '`$blackjack` (`$bj`) — Play Blackjack',
            '`$slots` — Spin the slots',
            '`$tictactoe` (`$ttt`) — Play Tic-Tac-Toe',
            '`$connect4` (`$c4`) — Play Connect 4',
            '`$memory` (`$mem`, `$match`) — Play Memory Match',
            '`$trivia` — Test your knowledge (Unlimited)',
            '`$emojiquiz` (`$quiz`) — Guess the movie/phrase',
            '`$poker` (`$pk`) — Multiplayer High Card Poker',
            '`$minesweeper` (`$mine`, `$ms`) — Classic Minesweeper',
            '`$hangman` (`$hang`, `$hm`) — Hangman (Unlimited words)',
            '`$wordchain` (`$wc`) — Multiplayer Word Chain',
            '`$scramble` (`$scram`) — Unscramble words (Unlimited)',
            '`$guess` (`$gn`) — Guess the number',
            '`$reaction` (`$react`) — Test reaction speed',
        ]
    },
    economy: {
        label: 'Economy',
        description: 'Money, jobs, and trading',
        emoji: '💰',
        commands: [
            '`$balance` (`$bal`, `$bl`) — Check your wallet and bank',
            '`$daily` (`$d`, `$dy`) — Claim daily reward',
            '`$work` (`$w`, `$wk`) — Work to earn money',
            '`$shop` (`$sh`, `$store`) — Browse items',
            '`$buy` (`$b`) <id> — Buy an item',
            '`$inventory` (`$inv`) — View your inventory',
            '`$transfer` (`$pay`, `$tf`) <user> <amount> — Send money',
            '`$leaderboard` (`$lb`, `$top`) — View richest users',
            '`$fish` (`$fishing`, `$cast`) — Catch fish for coins!',
        ]
    },
    utility: {
        label: 'Utility',
        description: 'Useful tools',
        emoji: '🔧',
        commands: [
            '`$ping` (`$p`) — Check bot latency',
            '`$serverinfo` — View server stats',
            '`$userinfo` (`$user`, `$ui`) [user] — View user stats',
            '`$avatar` (`$av`) [user] — View user avatar',
        ]
    },
    giveaway: {
        label: 'Giveaway',
        description: 'Host and manage giveaways',
        emoji: '🎉',
        commands: [
            '`$giveaway` (`$g`) start <time> <winners> <prize>`',
            '`$giveaway` (`$g`) end <message_id>`',
            '`$giveaway` (`$g`) reroll <message_id>`',
            '`$giveaway` (`$g`) list`',
            '`$giveaway` (`$g`) pause <message_id>`',
            '`$giveaway` (`$g`) resume <message_id>`',
            '`$giveaway` (`$g`) delete <message_id>`',
        ]
    }
};

const COMMAND_GUIDES = {
    // ═══ Fun & Games ═══
    'trivia': {
        usage: '',
        guide: '**Description:**\nTest your knowledge with unlimited trivia questions from various categories!\n\n**How to Play:**\n1. Run the command to get a random question.\n2. You have **15 seconds** to answer.\n3. Click the button (A, B, C, D) corresponding to the correct answer.\n\n**Rewards:**\n- Correct Answer: **Winner gets coins!**\n- Wrong Answer: No coins.'
    },
    'hangman': {
        usage: '',
        guide: '**Description:**\nGuess the hidden word letter by letter before you run out of lives!\n\n**How to Play:**\n- The bot picks a random word.\n- You have **6 lives** (❤️).\n- Type a single letter to guess it (e.g., "a").\n- Type the full word to solve it immediately.\n- A **Hint** is provided based on the word\'s dictionary definition.\n\n**Rewards:**\n- Win: **50 coins**'
    },
    'scramble': {
        usage: '',
        guide: '**Description:**\nUnscramble the jumbled letters to reveal the hidden word.\n\n**How to Play:**\n- A scrambled word will appear (e.g., "elppa" -> "apple").\n- A hint will show either the **definition** or the **starting letter**.\n- Type the correct word in the chat.\n- You have **30 seconds**!\n\n**Rewards:**\n- First to solve: **50 coins**'
    },
    'connect4': {
        usage: '@opponent [bet]',
        guide: '**Description:**\nClassic strategy game! Be the first to form a horizontal, vertical, or diagonal line of four matching discs.\n\n**How to Play:**\n1. Challenge a user: `$connect4 @user 100` (bets are optional).\n2. Opponent must accept buttons.\n3. Click the column number (1-7) to drop your disc.\n\n**Rules:**\n- Turns alternate between Red (🔴) and Yellow (🟡).\n- If the board fills up, it\'s a draw.\n\n**Payouts:**\n- Winner takes the pot (Bet x 2)!'
    },
    'memory': {
        usage: '',
        guide: '**Description:**\nTest your memory by matching pairs of emojis hidden behind buttons.\n\n**How to Play:**\n1. A 4x4 grid of buttons will appear.\n2. Click a button to reveal an emoji.\n3. Click another to try and match it.\n4. **Match:** Valid pair stays revealed.\n5. **Mismatch:** Both buttons flip back after 1 second.\n\n**Goal:** Find all **8 pairs** in the fewest attempts!\n\n**Rewards:**\n- Base Reward: **100 coins**\n- Attempt Penalty: -5 coins per attempt over 12\n- Speed Bonus: +50 coins (under 30s), +20 coins (under 60s)'
    },
    'minesweeper': {
        usage: '[bet]',
        guide: '**Description:**\nClassic Minesweeper puzzle! Reveal safe tiles to multiplier your bet, but watch out for bombs!\n\n**How to Play:**\n- 5x5 Grid with **5 hidden mines**.\n- Click `❓` to reveal a tile.\n- **Safe Tile (💎):** Reveals a number indicating nearby mines. Your multiplier increases!\n- **Mine (💣):** Game over, you lose your bet.\n- **Cashout:** Stop anytime to take your current winnings.\n\n**Multipliers:**\n- Starts at 1.0x\n- Each safe click increases the reward!'
    },
    'wordchain': {
        usage: '',
        guide: '**Description:**\nA multiplayer vocabulary chain reaction game.\n\n**How to Play:**\n1. The bot gives a starting word.\n2. You must reply with a word that **starts with the last letter** of the previous word.\n3. Example: `Fish` -> `Hat` -> `Tiger`.\n\n**Rules:**\n- Words must be valid English words.\n- No duplicate words allowed in the same game.\n- You cannot reply to yourself (unless playing solo, but it\'s harder!).\n\n**Rewards:**\n- Each valid word: **+Coins**'
    },
    'blackjack': {
        usage: '[bet]',
        guide: '**Description:**\nCasino classic! Beat the dealer\'s hand without going over 21.\n\n**How to Play:**\n- **Hit:** Take another card.\n- **Stand:** End your turn with current hand.\n- **Double Down:** Double bet, take 1 card, then stand.\n\n**Values:**\n- Cards 2-10: Face value\n- Face Cards (J, Q, K): 10\n- Ace: 1 or 11\n\n**Payouts:**\n- Win: 2x Bet\n- Blackjack (Natural 21): 2.5x Bet'
    },
    'poker': {
        usage: '[bet]',
        guide: '**Description:**\nTexas Hold\'em High Card showdown against other users.\n\n**How to Play:**\n1. Join the lobby (min 2 players).\n2. Everyone gets 2 hole cards.\n3. 5 Community cards are revealed.\n4. Best 5-card hand wins.\n\n**Hand Rankings:**\nRoyal Flush > Straight Flush > 4 of a Kind > Full House > Flush > Straight > 3 of a Kind > Two Pair > Pair > High Card\n\n**Payouts:**\n- Winner takes the entire pot!'
    },
    'tictactoe': {
        usage: '@opponent',
        guide: '**Description:**\nSimple 3x3 strategy game.\n\n**How to Play:**\n- Align 3 of your symbols (X or O) in a row, column, or diagonal.\n- Block your opponent from doing the same.\n- First to 3 wins!'
    },
    'slots': {
        usage: '[bet]',
        guide: '**Description:**\nSpin the reels and test your luck!\n\n**How to Play:**\n- Bet an amount and spin.\n- Match 3 symbols in the center row to win.\n\n**Payout table:**\n🍒�🍒 : 3x\n�🍋�🍋 : 5x\n�🍇🍇🍇 : 10x\n🔔🔔🔔 : 20x\n💎💎💎 : 50x\n7️⃣7️⃣7️⃣ : **100x JACKPOT!**'
    },
    'emojiquiz': {
        usage: '',
        guide: '**Description:**\nGuess the movie, catchphrase, or song title from a sequence of emojis.\n\n**How to Play:**\n- Access a quiz question.\n- Emojis will appear (e.g., 🦁👑).\n- Type the answer (`Lion King`).\n\n**Rewards:**\n- Correct answer: **Coins!**'
    },
    'rps': {
        usage: '',
        guide: '**Description:**\nRock, Paper, Scissors against the bot.\n\n**Rules:**\n- Rock beats Scissors\n- Scissors beats Paper\n- Paper beats Rock\n\n**Payout:**\n- Win: 2x Bet (if betting is enabled/added)'
    },
    'dice': {
        usage: '[bet]',
        guide: '**Description:**\nHigh risks, simple rewards. Roll a 6-sided die.\n\n**Rules:**\n- Roll **1, 2, or 3**: Lose.\n- Roll **4, 5, or 6**: Win!\n\n**Payout:**\n- Win: 2x Bet'
    },
    'coinflip': {
        usage: '<heads/tails> [bet]',
        guide: '**Description:**\nValues 50/50 chance. Flip a coin.\n\n**How to Play:**\n`$coinflip heads 100`\nIf it lands on Heads, you double your money!'
    },
    'guess': {
        usage: '',
        guide: '**Description:**\nNumber guessing game.\n\n**How to Play:**\n- I pick a number between 1 and 100.\n- You type numbers to guess.\n- I\'ll say "Too high" or "Too low".\n- Try to guess it in the fewest attempts!'
    },
    'reaction': {
        usage: '',
        guide: '**Description:**\nTest of reflexes.\n\n**How to Play:**\n- A message will say "Get Ready...".\n- Wait for the emoji (e.g., green square) to appear.\n- Click it as fast as you can!\n- Your time will be recorded.'
    },
    // ═══ Economy ═══
    'fish': {
        usage: '',
        guide: '**Description:**\nCast your line to catch fish using a Rod and Bait!\n\n**Requirements:**\n1. **Rod:** Bamboo (Tier 1), Fiberglass (Tier 2), or Carbon Fiber (Tier 3).\n2. **Bait:** Worm (Basic), Cricket (Better), or Squid (Pro).\n\n**How to Play:**\n- Buy a Rod and Bait from the `$shop`.\n- Run `$fish`.\n- The bot automatically uses your **Best Rod** and **Best Bait**.\n- Bait is consumed (-1) per cast.\n\n**Mechanics:**\n- Better Rod + Better Bait = Higher Luck (✨).\n- Higher Luck unlocks rarer fish (e.g., Sharks, Krakens).\n\n**Cooldown:**\n60 seconds.'
    },
    'work': {
        usage: '',
        guide: '**Description:**\nPerform a random job to earn a paycheck.\n\n**Cooldown:**\nCheck `$help work` to see the cooldown timer.\n\n**Rewards:**\n- Random amount of coins based on the job.'
    },
    'daily': {
        usage: '',
        guide: '**Description:**\nYour daily UBI (Universal Basic Income).\n\n**Rules:**\n- Can be claimed once every 24 hours.\n- Gives a flat amount of coins.'
    },
    'transfer': {
        usage: '@user <amount>',
        guide: '**Description:**\nPay another user from your balance.\n\n**Example:**\n`$transfer @User 500`\nSends 500 coins to User.\n*Note: Taxes may apply explicitly or implicitly depending on server settings!*'
    },
    'shop': {
        usage: '',
        guide: '**Description:**\nView the server marketplace.\n\n**Features:**\n- See items for sale.\n- Check prices and descriptions.\n- Use `$buy <item_id>` to purchase.'
    },
    'inventory': {
        usage: '',
        guide: '**Description:**\nSee what you own.\n\n**Content:**\n- Lists all items purchased or won.\n- Shows quantity of each item.'
    },
};

module.exports = {
    name: 'help',
    description: 'Shows a list of all available commands',
    async execute(message, args) {
        // 1. Check if user wants specific command help
        if (args.length > 0) {
            const name = args[0].toLowerCase();
            const command = message.client.commands.get(name) ||
                message.client.commands.find(c => c.aliases && c.aliases.includes(name));

            if (!command) {
                return message.reply(`❌ Could not find command **${name}**!`);
            }

            const guideInfo = COMMAND_GUIDES[command.name] || {};
            const usage = guideInfo.usage || command.usage || '';
            const guide = guideInfo.guide || command.description || 'No detailed guide available.';

            const embed = new EmbedBuilder()
                .setTitle(`Command: $${command.name}`)
                .setDescription(command.description || 'No description provided')
                .setColor(0x3498DB)
                .addFields(
                    { name: '📝 Aliases', value: command.aliases ? command.aliases.map(a => `$${a}`).join(', ') : 'None', inline: true },
                    { name: '⏱️ Cooldown', value: `${command.cooldown || 3} seconds`, inline: true },
                    { name: '💡 Usage', value: `$${command.name} ${usage}`, inline: true },
                    { name: '📖 How to Play', value: guide, inline: false }
                )
                .setFooter({ text: 'Type $help to see all commands' });

            return message.reply({ embeds: [embed] });
        }

        // 2. Default Behavior: Show Category Menu
        const homeEmbed = new EmbedBuilder()
            .setTitle('🤖  Bot Help Menu')
            .setDescription('Select a category from the dropdown menu below to see available commands.\n\n💡 **Tip:** Type `$help <command>` for more details on a specific command!')
            .setColor(0x5865F2)
            .addFields({ name: '🔗 Links', value: '[Support Server](https://discord.gg/) • [Invite Bot](https://discord.com/oauth2/authorize?client_id=' + message.client.user.id + '&permissions=8&scope=bot%20applications.commands)' })
            .setThumbnail(message.client.user.displayAvatarURL())
            .setFooter({ text: 'All commands use the prefix "$"' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Select a category...')
            .addOptions(
                Object.entries(categories).map(([key, value]) => ({
                    label: value.label,
                    description: value.description,
                    value: key,
                    emoji: value.emoji,
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await message.reply({
            embeds: [homeEmbed],
            components: [row]
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            const selection = i.values[0];
            const category = categories[selection];

            const categoryEmbed = new EmbedBuilder()
                .setTitle(`${category.emoji}  ${category.label} Commands`)
                .setDescription(category.commands.join('\n'))
                .setColor(0x5865F2)
                .setFooter({ text: 'Select another category to switch views' });

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true).setPlaceholder('Help session expired')
            );
            response.edit({ components: [disabledRow] }).catch(() => { });
        });
    }
};
