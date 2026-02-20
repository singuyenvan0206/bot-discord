const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');

module.exports = {
    name: 'connect4',
    aliases: ['c4'],
    description: 'Play Connect 4!',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply('❌ Please mention an opponent to play with!');
        if (opponent.bot) return message.reply('❌ You cannot play against bots (yet)!');
        if (opponent.id === message.author.id) return message.reply('❌ You cannot play against yourself!');

        let bet = parseInt(args[1]); // args[0] is user mention
        if (!args[1]) bet = 0;

        const authorUser = db.getUser(message.author.id);
        const opponentUser = db.getUser(opponent.id);

        if (bet > 0) {
            if (authorUser.balance < bet) return message.reply(`❌ You don't have enough coins! Balance: **${authorUser.balance}**`);
            if (opponentUser.balance < bet) return message.reply(`❌ ${opponent} doesn't have enough coins! Balance: **${opponentUser.balance}**`);
        }

        // Ask opponent to accept
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🔴 Connect 4 Challenge 🟡')
            .setDescription(`${opponent}, **${message.author.username}** challenges you to a game of Connect 4!${bet > 0 ? `\nBet: 💰 **${bet}**` : ''}\n\nDo you accept?`)
            .setColor(0xE67E22);

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('c4_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('c4_deny').setLabel('Deny').setStyle(ButtonStyle.Danger)
        );

        const confirmMsg = await message.reply({ content: `${opponent}`, embeds: [confirmEmbed], components: [confirmRow] });

        try {
            const confirmation = await confirmMsg.awaitMessageComponent({
                filter: i => i.user.id === opponent.id,
                time: 30000
            });

            if (confirmation.customId === 'c4_deny') {
                confirmation.update({ content: '❌ Challenge declined.', embeds: [], components: [] });
                return;
            }

            // Game Start
            if (bet > 0) {
                db.removeBalance(message.author.id, bet);
                db.removeBalance(opponent.id, bet);
            }
            await confirmation.deferUpdate(); // Acknowledge acceptance

            // Game State
            const ROWS = 6;
            const COLS = 7;
            const EMPTY = '⚪';
            const P1 = '🔴'; // Player 1 (Author)
            const P2 = '🟡'; // Player 2 (Opponent)
            const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));

            let turn = P1;
            let p1Id = message.author.id;
            let p2Id = opponent.id;
            let gameOver = false;

            const checkWin = () => {
                // Horizontal
                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS - 3; c++) {
                        if (grid[r][c] !== EMPTY && grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2] && grid[r][c] === grid[r][c + 3]) return grid[r][c];
                    }
                }
                // Vertical
                for (let r = 0; r < ROWS - 3; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (grid[r][c] !== EMPTY && grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c] && grid[r][c] === grid[r + 3][c]) return grid[r][c];
                    }
                }
                // Diagonal /
                for (let r = 3; r < ROWS; r++) {
                    for (let c = 0; c < COLS - 3; c++) {
                        if (grid[r][c] !== EMPTY && grid[r][c] === grid[r - 1][c + 1] && grid[r][c] === grid[r - 2][c + 2] && grid[r][c] === grid[r - 3][c + 3]) return grid[r][c];
                    }
                }
                // Diagonal \
                for (let r = 0; r < ROWS - 3; r++) {
                    for (let c = 0; c < COLS - 3; c++) {
                        if (grid[r][c] !== EMPTY && grid[r][c] === grid[r + 1][c + 1] && grid[r][c] === grid[r + 2][c + 2] && grid[r][c] === grid[r + 3][c + 3]) return grid[r][c];
                    }
                }
                if (grid.every(row => row.every(cell => cell !== EMPTY))) return 'draw';
                return null;
            };

            const dropToken = (col, token) => {
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (grid[r][col] === EMPTY) {
                        grid[r][col] = token;
                        return true;
                    }
                }
                return false; // Column full
            };

            const renderBoard = () => {
                // Only show buttons for columns, board is in description
                const str = grid.map(row => row.join('')).join('\n');
                return str + '\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣'; // Column numbers under board
            };

            const getButtons = (disabled = false) => {
                const row1 = new ActionRowBuilder();
                const row2 = new ActionRowBuilder();

                for (let i = 0; i < COLS; i++) {
                    const btn = new ButtonBuilder()
                        .setCustomId(`c4_${i}`)
                        .setLabel(`${i + 1}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(disabled || grid[0][i] !== EMPTY); // Disable if col full

                    if (i < 4) row1.addComponents(btn);
                    else row2.addComponents(btn);
                }
                return [row1, row2];
            };

            const gameEmbed = new EmbedBuilder()
                .setTitle('Connect 4')
                .setDescription(renderBoard())
                .setColor(0x3498DB)
                .setFooter({ text: `${turn === P1 ? message.author.username : opponent.username}'s turn (${turn})` });

            await confirmMsg.edit({ content: null, embeds: [gameEmbed], components: getButtons() });

            const collector = confirmMsg.createMessageComponentCollector({
                time: 300_000 // 5 min max game
            });

            collector.on('collect', async i => {
                if (gameOver) return;

                // Turn check
                const isP1 = i.user.id === p1Id;
                const isP2 = i.user.id === p2Id;

                if (!isP1 && !isP2) return i.reply({ content: '❌ You are not in this game!', ephemeral: true });

                if ((turn === P1 && !isP1) || (turn === P2 && !isP2)) {
                    return i.reply({ content: '❌ Not your turn!', ephemeral: true });
                }

                const col = parseInt(i.customId.split('_')[1]);

                const success = dropToken(col, turn);
                if (!success) return i.reply({ content: '❌ Column is full!', ephemeral: true });

                const winner = checkWin();

                if (winner) {
                    gameOver = true;
                    collector.stop();

                    let resultText = '';
                    if (winner === 'draw') {
                        resultText = "🤝 **It's a draw!**";
                        if (bet > 0) {
                            db.addBalance(p1Id, bet);
                            db.addBalance(p2Id, bet);
                            resultText += '\nBets returned.';
                        }
                    } else {
                        const winId = winner === P1 ? p1Id : p2Id;
                        const winName = winner === P1 ? message.author.username : opponent.username;
                        const prize = bet * 2;

                        if (bet > 0) {
                            db.addBalance(winId, prize);
                            resultText = `🏆 **${winName} wins!** (${winner})\n💰 **+${prize} coins!**`;
                        } else {
                            resultText = `🏆 **${winName} wins!** (${winner})`;
                        }
                    }

                    gameEmbed.setDescription(renderBoard() + `\n\n${resultText}`).setFooter({ text: 'Game Over' });
                    await i.update({ embeds: [gameEmbed], components: getButtons(true) });

                    startCooldown(message.client, 'connect4', p1Id);
                    startCooldown(message.client, 'connect4', p2Id);
                } else {
                    turn = turn === P1 ? P2 : P1;
                    gameEmbed.setDescription(renderBoard()).setFooter({ text: `${turn === P1 ? message.author.username : opponent.username}'s turn (${turn})` });
                    await i.update({ embeds: [gameEmbed], components: getButtons() });
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time' && !gameOver) {
                    confirmMsg.edit({ content: '⏰ Game timed out!', components: [] });
                    if (bet > 0) {
                        db.addBalance(p1Id, bet);
                        db.addBalance(p2Id, bet);
                    }
                    startCooldown(message.client, 'connect4', p1Id);
                    startCooldown(message.client, 'connect4', p2Id);
                }
            });

        } catch (e) {
            confirmMsg.edit({ content: '⏰ Challenge timed out.', embeds: [], components: [] });
        }
    }
};
