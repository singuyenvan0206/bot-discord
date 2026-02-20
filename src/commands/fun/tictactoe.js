const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { startCooldown } = require('../../utils/cooldown');
const db = require('../../database');
const config = require('../../config');

module.exports = {
    name: 'tictactoe',
    aliases: ['ttt'],
    description: 'Play Tic-Tac-Toe!',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const opponent = message.mentions.users.first();
        const isBot = !opponent || opponent.id === message.author.id || opponent.bot;
        const playerX = message.author;
        const playerO = isBot ? message.client.user : opponent;
        const uid = Date.now().toString(36);

        const board = Array(9).fill(null); // null, 'X', 'O'
        let currentTurn = 'X'; // X goes first

        function buildBoard() {
            const emojis = { X: '❌', O: '⭕', null: '⬛' };
            const rows = [];
            for (let r = 0; r < 3; r++) {
                const row = new ActionRowBuilder();
                for (let c = 0; c < 3; c++) {
                    const idx = r * 3 + c;
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ttt_${idx}_${uid}`)
                            .setLabel(board[idx] ? ' ' : `${idx + 1}`)
                            .setEmoji(board[idx] ? emojis[board[idx]] : undefined)
                            .setStyle(board[idx] === 'X' ? ButtonStyle.Danger : board[idx] === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                            .setDisabled(board[idx] !== null)
                    );
                }
                rows.push(row);
            }
            return rows;
        }

        function checkWinner() {
            const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
            for (const [a, b, c] of lines) {
                if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
            }
            return board.every(cell => cell !== null) ? 'draw' : null;
        }

        function botMove() {
            const empty = board.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
            if (empty.includes(4)) return 4;
            const corners = [0, 2, 6, 8].filter(i => empty.includes(i));
            if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
            return empty[Math.floor(Math.random() * empty.length)];
        }

        const turnPlayer = () => currentTurn === 'X' ? playerX : playerO;

        const embed = new EmbedBuilder()
            .setTitle('❌⭕  Tic-Tac-Toe')
            .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\nIt's ${turnPlayer().username}'s turn! (${currentTurn === 'X' ? '❌' : '⭕'})`)
            .setColor(config.COLORS.INFO).setTimestamp();

        const reply = await message.reply({ embeds: [embed], components: buildBoard() });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.customId.endsWith(uid) && (i.user.id === playerX.id || (!isBot && i.user.id === playerO.id)),
            time: 120_000,
        });

        collector.on('collect', async (i) => {
            if ((currentTurn === 'X' && i.user.id !== playerX.id) || (currentTurn === 'O' && i.user.id !== playerO.id)) {
                return i.reply({ content: `${config.EMOJIS.ERROR} It's not your turn!`, ephemeral: true });
            }

            const idx = parseInt(i.customId.split('_')[1]);
            if (board[idx] !== null) return i.reply({ content: `${config.EMOJIS.ERROR} That spot is taken!`, ephemeral: true });

            board[idx] = currentTurn;
            let winner = checkWinner();

            if (!winner && isBot && currentTurn === 'X') {
                currentTurn = 'O';
                const botIdx = botMove();
                if (botIdx !== undefined) board[botIdx] = 'O';
                winner = checkWinner();
                currentTurn = 'X';
            } else {
                currentTurn = currentTurn === 'X' ? 'O' : 'X';
            }

            if (winner) {
                let resultText;
                if (winner === 'draw') {
                    resultText = "🤝 **It's a draw!**";
                } else {
                    const winnerId = winner === 'X' ? playerX.id : playerO.id;
                    const winnerName = winner === 'X' ? playerX.username : playerO.username;
                    const reward = config.ECONOMY.TICTACTOE_REWARD;

                    if (winnerId !== message.client.user.id) {
                        db.addBalance(winnerId, reward);
                        resultText = `🏆 **${winnerName} wins!** (${winner === 'X' ? '❌' : '⭕'})\n${config.EMOJIS.COIN} **+${reward} coins!**`;
                    } else {
                        resultText = `🏆 **${winnerName} wins!** (${winner === 'X' ? '❌' : '⭕'})`;
                    }
                }

                const finalEmbed = new EmbedBuilder()
                    .setTitle('❌⭕  Tic-Tac-Toe — Game Over')
                    .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\n${resultText}`)
                    .setColor(winner === 'draw' ? config.COLORS.WARNING : config.COLORS.SUCCESS).setTimestamp();

                const disabledBoard = buildBoard().map(row => {
                    row.components.forEach(btn => btn.setDisabled(true));
                    return row;
                });

                await i.update({ embeds: [finalEmbed], components: disabledBoard });
                collector.stop();
            } else {
                const turnEmbed = new EmbedBuilder()
                    .setTitle('❌⭕  Tic-Tac-Toe')
                    .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\nIt's ${turnPlayer().username}'s turn! (${currentTurn === 'X' ? '❌' : '⭕'})`)
                    .setColor(config.COLORS.INFO).setTimestamp();

                await i.update({ embeds: [turnEmbed], components: buildBoard() });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                reply.edit({ embeds: [new EmbedBuilder().setTitle(`❌⭕  Tic-Tac-Toe — ${config.EMOJIS.TIMER} Timed Out`).setColor(config.COLORS.NEUTRAL)], components: [] }).catch(() => { });
            }
            startCooldown(message.client, 'tictactoe', message.author.id);
            if (opponent && !isBot) startCooldown(message.client, 'tictactoe', opponent.id);
        });
    }
};
