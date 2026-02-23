
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getUserMultiplier, getTotalIncomeMultiplier } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'connect4',
    aliases: ['c4'],
    description: 'Chơi trò chơi Bốn Hàng (Connect 4)!',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply(t('common.mention_opponent', lang));
        if (opponent.bot) return message.reply(t('common.no_challenge_bot', lang));
        if (opponent.id === message.author.id) return message.reply(t('common.no_challenge_self', lang));

        let bet = parseInt(args[1]); // args[0] is user mention
        if (!args[1]) bet = 0;

        const authorUser = db.getUser(message.author.id);
        const opponentUser = db.getUser(opponent.id);

        if (bet > 0) {
            if (authorUser.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: authorUser.balance }));
            if (opponentUser.balance < bet) return message.reply(t('common.opponent_insufficient_funds', lang, { opponent: opponent.username, balance: opponentUser.balance }));
        }

        const betStr = bet > 0 ? t('connect4.bet_amount', lang, { emoji: config.EMOJIS.COIN, amount: bet }) : '';

        // Ask opponent to accept
        const confirmEmbed = new EmbedBuilder()
            .setTitle(t('connect4.challenge_title', lang))
            .setDescription(t('connect4.challenge_msg', lang, { opponent: opponent.toString(), user: message.author.username, bet: betStr }))
            .setColor(config.COLORS.WARNING);

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('c4_accept').setLabel(t('connect4.accept', lang)).setEmoji(config.EMOJIS.SUCCESS).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('c4_deny').setLabel(t('connect4.deny', lang)).setEmoji(config.EMOJIS.ERROR).setStyle(ButtonStyle.Danger)
        );

        const confirmMsg = await message.reply({ content: opponent.toString(), embeds: [confirmEmbed], components: [confirmRow] });

        try {
            const confirmation = await confirmMsg.awaitMessageComponent({
                filter: i => i.user.id === opponent.id,
                time: 30000
            });

            if (confirmation.customId === 'c4_deny') {
                confirmation.update({ content: t('connect4.denied', lang), embeds: [], components: [] });
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
                .setTitle(t('connect4.title', lang))
                .setDescription(renderBoard())
                .setColor(config.COLORS.INFO)
                .setFooter({ text: t('connect4.turn_footer', lang, { user: turn === P1 ? message.author.username : opponent.username, symbol: turn }) });

            await confirmMsg.edit({ content: null, embeds: [gameEmbed], components: getButtons() });

            const collector = confirmMsg.createMessageComponentCollector({
                time: 300_000 // 5 min max game
            });

            collector.on('collect', async i => {
                if (gameOver) return;

                const isP1 = i.user.id === p1Id;
                const isP2 = i.user.id === p2Id;

                if (!isP1 && !isP2) return i.reply({ content: t('connect4.not_participant', lang), ephemeral: true });

                if ((turn === P1 && !isP1) || (turn === P2 && !isP2)) {
                    return i.reply({ content: t('tictactoe.not_your_turn', lang), ephemeral: true });
                }

                const col = parseInt(i.customId.split('_')[1]);

                const success = dropToken(col, turn);
                if (!success) return i.reply({ content: t('connect4.column_full', lang), ephemeral: true });

                const winner = checkWin();

                if (winner) {
                    gameOver = true;
                    collector.stop();

                    let resultText = '';
                    if (winner === 'draw') {
                        resultText = t('connect4.draw', lang);
                        if (bet > 0) {
                            db.addBalance(p1Id, bet);
                            db.addBalance(p2Id, bet);
                            resultText += t('connect4.refund', lang);
                        }
                    } else {
                        const winId = winner === P1 ? p1Id : p2Id;
                        const winName = winner === P1 ? message.author.username : opponent.username;

                        if (bet > 0) {
                            const prize = bet * 2;
                            db.addBalance(winId, prize);
                            resultText = t('connect4.win', lang, { winner: winName, symbol: winner }) +
                                t('connect4.reward', lang, { emoji: config.EMOJIS.COIN, amount: prize });
                        } else {
                            // No bet: give base reward with item multiplier
                            const baseReward = config.ECONOMY.TICTACTOE_REWARD ?? 100;
                            const totalMulti = getTotalIncomeMultiplier(winId);
                            const bonusAmount = Math.floor(baseReward * totalMulti);
                            const totalReward = baseReward + bonusAmount;
                            db.addBalance(winId, totalReward);
                            resultText = t('connect4.win', lang, { winner: winName, symbol: winner }) +
                                t('connect4.reward', lang, { emoji: config.EMOJIS.COIN, amount: totalReward });
                            if (bonusAmount > 0) {
                                resultText += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 250%)' : 'Includes 🎁 Bonus (Capped 250%)'}: +${bonusAmount.toLocaleString()} coins)*`;
                            }
                        }
                    }

                    gameEmbed.setDescription(renderBoard() + `\n\n${resultText}`).setFooter({ text: t('connect4.end_footer', lang) });
                    await i.update({ embeds: [gameEmbed], components: getButtons(true) });

                    startCooldown(message.client, 'connect4', p1Id);
                    startCooldown(message.client, 'connect4', p2Id);
                } else {
                    turn = turn === P1 ? P2 : P1;
                    gameEmbed.setDescription(renderBoard()).setFooter({ text: t('connect4.turn_footer', lang, { user: turn === P1 ? message.author.username : opponent.username, symbol: turn }) });
                    await i.update({ embeds: [gameEmbed], components: getButtons() });
                }
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time' && !gameOver) {
                    confirmMsg.edit({ content: t('connect4.timeout', lang), components: [] });
                    if (bet > 0) {
                        db.addBalance(p1Id, bet);
                        db.addBalance(p2Id, bet);
                    }
                    startCooldown(message.client, 'connect4', p1Id);
                    startCooldown(message.client, 'connect4', p2Id);
                }
            });

        } catch (e) {
            confirmMsg.edit({ content: t('connect4.challenge_timeout', lang), embeds: [], components: [] });
        }
    }
};
