
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getUserMultiplier, getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'connect4',
    aliases: ['c4'],
    description: 'Chơi Bốn Hàng (Play Connect 4 against another player)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply(t('common.mention_opponent', lang));
        if (opponent.bot) return message.reply(t('common.no_challenge_bot', lang));
        if (opponent.id === message.author.id) return message.reply(t('common.no_challenge_self', lang));

        let bet = args[1] ? parseAmount(args[1], authorUser.balance, config.ECONOMY.MAX_BET) : 0;

        const authorUser = await db.getUser(message.author.id, message.guild.id);
        const opponentUser = await db.getUser(opponent.id, message.guild.id);

        if (bet > 0) {
            if (authorUser.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: authorUser.balance.toLocaleString() }));
            if (opponentUser.balance < bet) return message.reply(t('common.opponent_insufficient_funds', lang, { opponent: opponent.username, balance: opponentUser.balance.toLocaleString() }));
        }

        const betStr = bet > 0 ? t('connect4.bet_amount', lang, { emoji: config.EMOJIS.COIN, amount: bet.toLocaleString() }) : '';

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
                await db.removeBalance(message.guild.id, message.author.id, bet);
                await db.removeBalance(message.guild.id, opponent.id, bet);
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
            let p1Member = message.member;
            let p2Member = confirmation.member;
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

                // Grant Action XP for the move
                const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                await addXp(i.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, i.guild.id);

                const winner = checkWin();

                if (winner) {
                    gameOver = true;
                    collector.stop();

                    let resultText = '';
                    if (winner === 'draw') {
                        resultText = t('connect4.draw', lang);
                        if (bet > 0) {
                            await db.addBalance(i.guild.id, p1Id, bet);
                            await db.addBalance(i.guild.id, p2Id, bet);
                            resultText += t('connect4.refund', lang);
                        }
                    } else {
                        const winMember = winner === P1 ? p1Member : p2Member;

                        // Grant Win XP
                        const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                        const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                        await addXp(winMember, winXp, i.guild.id);

                        const baseReward = bet > 0 ? bet * 2 : (config.ECONOMY.TICTACTOE_REWARD || 100);
                        const { total: totalReward, bonus: bonusAmount, percent } = await calculateReward(baseReward, winMember, 'income', { pvpMode: bet > 0 });
                        const winId = winner === P1 ? p1Id : p2Id;
                        const winName = winner === P1 ? message.author.username : opponent.username;

                        resultText = t('connect4.win', lang, { winner: winName, symbol: winner }) +
                            t('connect4.reward', lang, { emoji: config.EMOJIS.COIN, amount: totalReward.toLocaleString() });

                        if (bonusAmount > 0) {
                            resultText += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent: percent.toLocaleString() });
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

            collector.on('end', async (_, reason) => {
                if (reason === 'time' && !gameOver) {
                    confirmMsg.edit({ content: t('connect4.timeout', lang), components: [] });
                    if (bet > 0) {
                        await db.addBalance(message.guild.id, p1Id, bet);
                        await db.addBalance(message.guild.id, p2Id, bet);
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
