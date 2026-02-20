const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'connect4',
    aliases: ['c4'],
    description: 'Chơi trò chơi Bốn Hàng (Connect 4)!',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply(`${config.EMOJIS.ERROR} Vui lòng nhắc tên (mention) đối thủ để chơi cùng!`);
        if (opponent.bot) return message.reply(`${config.EMOJIS.ERROR} Bạn không thể thách đấu với bot!`);
        if (opponent.id === message.author.id) return message.reply(`${config.EMOJIS.ERROR} Bạn không thể thách đấu với chính mình!`);

        let bet = parseInt(args[1]); // args[0] is user mention
        if (!args[1]) bet = 0;

        const authorUser = db.getUser(message.author.id);
        const opponentUser = db.getUser(opponent.id);

        if (bet > 0) {
            if (authorUser.balance < bet) return message.reply(`${config.EMOJIS.ERROR} Bạn không đủ tiền! Số dư: **${authorUser.balance}**`);
            if (opponentUser.balance < bet) return message.reply(`${config.EMOJIS.ERROR} ${opponent} không đủ tiền! Số dư của họ: **${opponentUser.balance}**`);
        }

        // Ask opponent to accept
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🔴 Thách Đấu Bốn Hàng (Connect 4) 🟡')
            .setDescription(`${opponent}, **${message.author.username}** đã thách đấu bạn một ván Bốn Hàng!${bet > 0 ? `\nTiền cược: ${config.EMOJIS.COIN} **${bet}**` : ''}\n\nBạn có chấp nhận không?`)
            .setColor(config.COLORS.WARNING);

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('c4_accept').setLabel('Chấp nhận').setEmoji(config.EMOJIS.SUCCESS).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('c4_deny').setLabel('Từ chối').setEmoji(config.EMOJIS.ERROR).setStyle(ButtonStyle.Danger)
        );

        const confirmMsg = await message.reply({ content: `${opponent}`, embeds: [confirmEmbed], components: [confirmRow] });

        try {
            const confirmation = await confirmMsg.awaitMessageComponent({
                filter: i => i.user.id === opponent.id,
                time: 30000
            });

            if (confirmation.customId === 'c4_deny') {
                confirmation.update({ content: `${config.EMOJIS.ERROR} Thách đấu đã bị từ chối.`, embeds: [], components: [] });
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
                const str = grid.map(row => row.join('')).join('\n');
                return str + '\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
            };

            const getButtons = (disabled = false) => {
                const row1 = new ActionRowBuilder();
                const row2 = new ActionRowBuilder();

                for (let i = 0; i < COLS; i++) {
                    const btn = new ButtonBuilder()
                        .setCustomId(`c4_${i}`)
                        .setLabel(`${i + 1}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(disabled || grid[0][i] !== EMPTY);

                    if (i < 4) row1.addComponents(btn);
                    else row2.addComponents(btn);
                }
                return [row1, row2];
            };

            const gameEmbed = new EmbedBuilder()
                .setTitle('Bốn Hàng (Connect 4)')
                .setDescription(renderBoard())
                .setColor(config.COLORS.INFO)
                .setFooter({ text: `Lượt của: ${turn === P1 ? message.author.username : opponent.username} (${turn})` });

            await confirmMsg.edit({ content: null, embeds: [gameEmbed], components: getButtons() });

            const collector = confirmMsg.createMessageComponentCollector({
                time: 300_000 // 5 min max game
            });

            collector.on('collect', async i => {
                if (gameOver) return;

                const isP1 = i.user.id === p1Id;
                const isP2 = i.user.id === p2Id;

                if (!isP1 && !isP2) return i.reply({ content: `${config.EMOJIS.ERROR} Bạn không tham gia ván đấu này!`, ephemeral: true });

                if ((turn === P1 && !isP1) || (turn === P2 && !isP2)) {
                    return i.reply({ content: `${config.EMOJIS.ERROR} Không phải lượt của bạn!`, ephemeral: true });
                }

                const col = parseInt(i.customId.split('_')[1]);

                const success = dropToken(col, turn);
                if (!success) return i.reply({ content: `${config.EMOJIS.ERROR} Cột này đã đầy!`, ephemeral: true });

                const winner = checkWin();

                if (winner) {
                    gameOver = true;
                    collector.stop();

                    let resultText = '';
                    if (winner === 'draw') {
                        resultText = "🤝 **Hòa rồi!**";
                        if (bet > 0) {
                            db.addBalance(p1Id, bet);
                            db.addBalance(p2Id, bet);
                            resultText += '\nTiền cược đã được hoàn trả.';
                        }
                    } else {
                        const winId = winner === P1 ? p1Id : p2Id;
                        const winName = winner === P1 ? message.author.username : opponent.username;
                        const prize = bet * 2;

                        if (bet > 0) {
                            db.addBalance(winId, prize);
                            resultText = `🏆 **${winName} đã thắng!** (${winner})\n${config.EMOJIS.COIN} **+${prize} coins!**`;
                        } else {
                            resultText = `🏆 **${winName} đã thắng!** (${winner})`;
                        }
                    }

                    gameEmbed.setDescription(renderBoard() + `\n\n${resultText}`).setFooter({ text: 'Kết thúc ván đấu' });
                    await i.update({ embeds: [gameEmbed], components: getButtons(true) });

                    startCooldown(message.client, 'connect4', p1Id);
                    startCooldown(message.client, 'connect4', p2Id);
                } else {
                    turn = turn === P1 ? P2 : P1;
                    gameEmbed.setDescription(renderBoard()).setFooter({ text: `Lượt của: ${turn === P1 ? message.author.username : opponent.username} (${turn})` });
                    await i.update({ embeds: [gameEmbed], components: getButtons() });
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time' && !gameOver) {
                    confirmMsg.edit({ content: `${config.EMOJIS.TIMER} Ván đấu đã hết thời gian!`, components: [] });
                    if (bet > 0) {
                        db.addBalance(p1Id, bet);
                        db.addBalance(p2Id, bet);
                    }
                    startCooldown(message.client, 'connect4', p1Id);
                    startCooldown(message.client, 'connect4', p2Id);
                }
            });

        } catch (e) {
            confirmMsg.edit({ content: `${config.EMOJIS.TIMER} Thời gian thách đấu đã hết.`, embeds: [], components: [] });
        }
    }
};
