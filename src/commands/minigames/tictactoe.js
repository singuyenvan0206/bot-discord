const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { startCooldown } = require('../../utils/cooldown');
const { calculateReward } = require('../../utils/multiplier');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const { addHouseProfit } = require('../../utils/economy');

module.exports = {
    name: 'tictactoe',
    aliases: ['ttt'],
    description: 'Cờ ca-rô (Play Tic-Tac-Toe game)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const opponent = message.mentions.users.first();
        const isBot = !opponent || opponent.id === message.author.id || opponent.bot;
        const playerX = message.author;
        const playerO = isBot ? message.client.user : opponent;
        const playerXMember = message.member;
        const playerOMember = isBot ? null : (message.guild.members.cache.get(opponent.id) || await message.guild.members.fetch(opponent.id).catch(() => null));
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
                    const emojis = { X: '❌', O: '⭕' };
                    const btn = new ButtonBuilder()
                        .setCustomId(`ttt_${idx}_${uid}`)
                        .setStyle(board[idx] === 'X' ? ButtonStyle.Danger : board[idx] === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(board[idx] !== null);

                    if (board[idx]) {
                        btn.setLabel(' ').setEmoji(emojis[board[idx]]);
                    } else {
                        btn.setLabel(`${idx + 1}`);
                    }

                    row.addComponents(btn);
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
            const emptyCells = board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

            // 30% chance to make a random move (easy mode)
            if (Math.random() < 0.4) {
                return emptyCells[Math.floor(Math.random() * emptyCells.length)];
            }

            // Otherwise use Minimax for optimal play
            function score(b, depth) {
                const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
                for (const [a, x, c] of lines) {
                    if (b[a] && b[a] === b[x] && b[a] === b[c]) {
                        return b[a] === 'O' ? 10 - depth : depth - 10;
                    }
                }
                return 0;
            }

            function minimax(b, depth, isMaximizing) {
                const s = score(b, depth);
                if (s !== 0) return s;
                if (b.every(c => c !== null)) return 0;

                if (isMaximizing) {
                    let best = -Infinity;
                    for (let i = 0; i < 9; i++) {
                        if (b[i] === null) {
                            b[i] = 'O';
                            best = Math.max(best, minimax(b, depth + 1, false));
                            b[i] = null;
                        }
                    }
                    return best;
                } else {
                    let best = Infinity;
                    for (let i = 0; i < 9; i++) {
                        if (b[i] === null) {
                            b[i] = 'X';
                            best = Math.min(best, minimax(b, depth + 1, true));
                            b[i] = null;
                        }
                    }
                    return best;
                }
            }

            let bestScore = -Infinity, bestMove = -1;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'O';
                    const s = minimax(board, 0, false);
                    board[i] = null;
                    if (s > bestScore) { bestScore = s; bestMove = i; }
                }
            }
            return bestMove;
        }

        const turnPlayer = () => currentTurn === 'X' ? playerX : playerO;

        const turnEmbed = () => new EmbedBuilder()
            .setTitle(t('tictactoe.title', lang))
            .setDescription(
                t('tictactoe.vs', lang, { playerX: playerX.username, playerO: playerO.username }) + '\n\n' +
                t('tictactoe.turn', lang, { player: turnPlayer().username, symbol: currentTurn === 'X' ? '❌' : '⭕' })
            )
            .setColor(config.COLORS.INFO).setTimestamp();

        const reply = await message.reply({ embeds: [turnEmbed()], components: buildBoard() });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.customId.endsWith(uid) && (i.user.id === playerX.id || (!isBot && i.user.id === playerO.id)),
            time: 120_000,
        });

        collector.on('collect', async (i) => {
            if ((currentTurn === 'X' && i.user.id !== playerX.id) || (currentTurn === 'O' && i.user.id !== playerO.id)) {
                return i.reply({ content: t('tictactoe.not_your_turn', lang), ephemeral: true });
            }

            const idx = parseInt(i.customId.split('_')[1]);
            if (board[idx] !== null) return i.reply({ content: t('tictactoe.already_taken', lang), ephemeral: true });

            board[idx] = currentTurn;

            // Grant Action XP for the move
            if (i.user.id !== message.client.user.id) {
                const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                await addXp(i.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, i.guild.id);
            }

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
                    resultText = t('tictactoe.draw', lang);
                } else {
                    const winnerId = winner === 'X' ? playerX.id : playerO.id;
                    const winnerName = winner === 'X' ? playerX.username : playerO.username;
                    const baseReward = config.ECONOMY.TICTACTOE_REWARD;

                    if (winnerId !== message.client.user.id) {
                        const winnerMember = winner === 'X' ? playerXMember : playerOMember;
                        const { total: totalReward, bonus: bonusAmount, cap } = await calculateReward(baseReward, winnerMember);
                        await db.addBalance(message.guild.id, winnerId, totalReward);

                        // Grant Win XP
                        const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                        const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                        await addXp(winnerMember, winXp, message.guild.id);

                        resultText = t('tictactoe.winner_msg', lang, { winner: winnerName, symbol: winner === 'X' ? '❌' : '⭕' }) +
                            t('tictactoe.reward_msg', lang, { emoji: config.EMOJIS.COIN, amount: totalReward.toLocaleString() });

                        if (bonusAmount > 0) {
                            resultText += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent: (percent || 0).toLocaleString(), cap: (cap || 0).toLocaleString() });
                        }
                    } else {
                        await addHouseProfit(i, baseReward);

                        // Grant Win XP to Bot
                        const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                        const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                        await addXp(message.client.user.id, winXp, message.guild.id);

                        resultText = t('tictactoe.winner_msg', lang, { winner: winnerName, symbol: winner === 'X' ? '❌' : '⭕' }) +
                            t('tictactoe.reward_msg', lang, { emoji: config.EMOJIS.COIN, amount: baseReward.toLocaleString() });
                    }
                }

                const finalEmbed = new EmbedBuilder()
                    .setTitle(t('tictactoe.ending_title', lang))
                    .setDescription(t('tictactoe.vs', lang, { playerX: playerX.username, playerO: playerO.username }) + `\n\n${resultText}`)
                    .setColor(winner === 'draw' ? config.COLORS.WARNING : config.COLORS.SUCCESS).setTimestamp();

                const disabledBoard = buildBoard().map(row => {
                    row.components.forEach(btn => btn.setDisabled(true));
                    return row;
                });

                await i.update({ embeds: [finalEmbed], components: disabledBoard });
                collector.stop();
            } else {
                await i.update({ embeds: [turnEmbed()], components: buildBoard() });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                reply.edit({ embeds: [new EmbedBuilder().setTitle(t('tictactoe.timeout_title', lang, { emoji: config.EMOJIS.TIMER })).setColor(config.COLORS.NEUTRAL)], components: [] }).catch(() => { });
            }
            startCooldown(message.client, 'tictactoe', message.author.id);
            if (opponent && !isBot) startCooldown(message.client, 'tictactoe', opponent.id);
        });
    }
};
