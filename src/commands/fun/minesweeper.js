const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'minesweeper',
    aliases: ['mine', 'ms'],
    description: 'Chơi Dò Mìn (Minesweeper)! (24 ô)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const { parseAmount } = require('../../utils/economy');
        let bet = args[0] ? parseAmount(args[0], user.balance) : 0;

        if (args[0] && bet <= 0) return message.reply(`❌ ${t('common.invalid_amount', lang)}`);
        if (!args[0]) bet = 50;

        if (bet > 0) {
            if (user.balance < bet) {
                return message.reply(t('common.insufficient_funds', lang, { balance: user.balance }));
            }
            if (bet > config.ECONOMY.MAX_BET) return message.reply(t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() }));
            db.removeBalance(user.id, bet);
        }

        const size = 24; // 24 interactive cells (0-23)
        const mineCount = 5; // Fixed for balance in 24 cells (approx 20% density)

        // Game State
        // 'H' = Hidden, 'F' = Flagged, 'M' = Mine (Revealed), '0'-'8' = Number (Revealed)
        // We'll store the *actual* grid and the *visible* state separately?
        // Actually, let's just use internal state and re-render.

        const gameState = {
            grid: Array(size).fill(0), // 0 = empty, 'M' = Mine
            revealed: new Set(),
            flagged: new Set(),
            isFlagging: false,
            minesPlaced: false,
            startTime: Date.now()
        };

        const generateGrid = (safeIndex) => {
            let mines = 0;
            while (mines < mineCount) {
                const idx = Math.floor(Math.random() * size);
                if (idx !== safeIndex && gameState.grid[idx] !== 'M') {
                    // Start area safety: Check neighbors too?
                    // For 24 cells, just ensuring the clicked cell is safe is enough.
                    gameState.grid[idx] = 'M';
                    mines++;
                }
            }

            // Calculate numbers
            for (let i = 0; i < size; i++) {
                if (gameState.grid[i] === 'M') continue;
                gameState.grid[i] = getNeighbors(i).filter(n => gameState.grid[n] === 'M').length;
            }
            gameState.minesPlaced = true;
        };

        const getNeighbors = (index) => {
            const neighbors = [];
            const r = Math.floor(index / 5);
            const c = index % 5;

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    // Check bounds: carefully, since the last row only has 4 cells (0-3 in that row, total index 20-23)
                    // Wait, our grid is 0-23.
                    // Row 0: 0-4
                    // Row 1: 5-9
                    // Row 2: 10-14
                    // Row 3: 15-19
                    // Row 4: 20-23 (Only 4 cols)

                    if (nr >= 0 && nr <= 4) {
                        // Max col depends on row
                        const maxCol = (nr === 4) ? 3 : 4;
                        if (nc >= 0 && nc <= maxCol) {
                            neighbors.push(nr * 5 + nc);
                        }
                    }
                }
            }
            return neighbors;
        };

        const reveal = (index) => {
            if (gameState.revealed.has(index) || gameState.flagged.has(index)) return 'SAFE';

            gameState.revealed.add(index);

            if (gameState.grid[index] === 'M') return 'BOOM';

            if (gameState.grid[index] === 0) {
                // Flood fill
                const queue = [index];
                while (queue.length > 0) {
                    const curr = queue.shift();
                    const neighbors = getNeighbors(curr);
                    for (const n of neighbors) {
                        if (!gameState.revealed.has(n) && !gameState.flagged.has(n)) {
                            gameState.revealed.add(n);
                            if (gameState.grid[n] === 0) {
                                queue.push(n);
                            }
                        }
                    }
                }
            }
            return 'SAFE';
        };

        const renderComponents = (gameOver = false, won = false) => {
            const rows = [];
            for (let r = 0; r < 5; r++) {
                const row = new ActionRowBuilder();
                const maxC = (r === 4) ? 4 : 5;

                for (let c = 0; c < maxC; c++) {
                    const idx = r * 5 + c;
                    const btn = new ButtonBuilder().setCustomId(`ms_${idx}`);

                    if (gameOver && gameState.grid[idx] === 'M') {
                        btn.setEmoji('💣').setStyle(won ? ButtonStyle.Success : ButtonStyle.Danger).setDisabled(true);
                    } else if (gameState.revealed.has(idx)) {
                        const val = gameState.grid[idx];
                        if (val === 0) btn.setEmoji('🟦').setStyle(ButtonStyle.Secondary).setDisabled(true);
                        else btn.setLabel(val.toString()).setStyle(ButtonStyle.Success).setDisabled(true); // Numbers green
                    } else if (gameState.flagged.has(idx)) {
                        btn.setEmoji('🚩').setStyle(ButtonStyle.Danger);
                    } else {
                        btn.setEmoji('⬜').setStyle(ButtonStyle.Secondary);
                    }
                    row.addComponents(btn);
                }

                // Add control button to last row
                if (r === 4) {
                    const flagBtn = new ButtonBuilder()
                        .setCustomId('ms_toggle')
                        .setLabel(gameState.isFlagging ? t('minesweeper.flag_on', lang) : t('minesweeper.flag_off', lang))
                        .setStyle(gameState.isFlagging ? ButtonStyle.Danger : ButtonStyle.Primary) // Red if On, Blue if Off
                        .setEmoji(gameState.isFlagging ? '🚩' : '🖱️')
                        .setDisabled(gameOver);
                    row.addComponents(flagBtn);
                }
                rows.push(row);
            }
            return rows;
        };

        const embed = new EmbedBuilder()
            .setTitle(t('minesweeper.title', lang))
            .setDescription(t('minesweeper.description', lang, { mineCount, bet: bet || 0 }))
            .setColor(0xE67E22);

        const reply = await message.reply({ embeds: [embed], components: renderComponents() });
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300_000, // 5 min
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            const id = i.customId;

            if (id === 'ms_toggle') {
                gameState.isFlagging = !gameState.isFlagging;
                await i.update({ components: renderComponents() });
                return;
            }

            const idx = parseInt(id.split('_')[1]);

            // Generate grid on first click
            if (!gameState.minesPlaced) {
                if (gameState.isFlagging) {
                    // Can't flag on first turn conceptually, or allows it but meaningless until mines exist?
                    // Allowed to flag, but won't generate grid yet.
                    gameState.flagged.add(idx);
                    await i.update({ components: renderComponents() });
                    return;
                }
                generateGrid(idx);
            }

            if (gameState.isFlagging) {
                if (gameState.revealed.has(idx)) return i.deferUpdate();
                if (gameState.flagged.has(idx)) gameState.flagged.delete(idx);
                else gameState.flagged.add(idx);
                await i.update({ components: renderComponents() });
            } else {
                if (gameState.flagged.has(idx)) return i.reply({ content: t('minesweeper.unflag_first', lang), ephemeral: true });

                const result = reveal(idx);

                if (result === 'BOOM') {
                    collector.stop('boom');

                    let loseAmount = bet;
                    let shieldUsed = false;

                    // Check for Shield (Item ID 6)
                    const inv = JSON.parse(user.inventory || '{}');
                    if (inv['6'] && inv['6'] > 0) {
                        loseAmount = Math.floor(bet * 0.5);
                        shieldUsed = true;
                        db.addBalance(user.id, loseAmount); // Refund 50% (since 100% was already removed)
                    }

                    const loseEmbed = new EmbedBuilder()
                        .setTitle(t('minesweeper.lose_title', lang))
                        .setDescription(t('minesweeper.lose_desc', lang) + '\n' +
                            (shieldUsed
                                ? t('minesweeper.shield_used', lang, { amount: loseAmount })
                                : t('minesweeper.bet_lost', lang, { amount: loseAmount })))
                        .setColor(0xE74C3C);
                    await i.update({ embeds: [loseEmbed], components: renderComponents(true, false) });
                } else {
                    // Check Win
                    const hiddenCount = size - gameState.revealed.size;
                    if (hiddenCount === mineCount) {
                        collector.stop('win');
                        let prize = 0;
                        if (bet > 0) {
                            const baseWin = Math.ceil(bet * 1.5);
                            const { getUserMultiplier } = require('../../utils/multiplier');
                            const multiplier = getUserMultiplier(user.id, 'gamble');
                            const bonus = Math.floor(baseWin * multiplier);
                            prize = baseWin + bonus;

                            db.addBalance(user.id, prize);

                            const winEmbed = new EmbedBuilder()
                                .setTitle(`${config.EMOJIS.SUCCESS}  ${t('minesweeper.win_title', lang)}`)
                                .setDescription(t('minesweeper.win_desc', lang) + `\n\n**${t('fish.income', lang)}:** ${config.EMOJIS.COIN} +${baseWin}\n**${t('fish.item_bonus', lang)}:** ✨ +${bonus} (${Math.round(multiplier * 100)}%)\n**${t('balance.description', lang, { balance: prize })}**`)
                                .setColor(config.COLORS.SUCCESS);
                            await i.update({ embeds: [winEmbed], components: renderComponents(true, true) });
                        } else {
                            const winEmbed = new EmbedBuilder()
                                .setTitle(`${config.EMOJIS.SUCCESS}  ${t('minesweeper.win_title', lang)}`)
                                .setDescription(t('minesweeper.win_desc', lang))
                                .setColor(config.COLORS.SUCCESS);
                            await i.update({ embeds: [winEmbed], components: renderComponents(true, true) });
                        }
                    } else {
                        await i.update({ components: renderComponents() });
                    }
                }
            }
        }
        );


        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                reply.edit({ content: `⏰ ${t('tictactoe.timeout_title', lang)}`, components: [] }).catch(() => { });
            }
            startCooldown(message.client, 'minesweeper', message.author.id);
        });
    }
};
