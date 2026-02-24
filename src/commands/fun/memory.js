const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getUserMultiplier, getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');

const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

const MEM_EMOJIS = ['🍎', '🍌', '🍒', '🍇', '🍉', '🍓', '🍑', '🍍'];

module.exports = {
    name: 'memory',
    aliases: ['mem', 'match'],
    description: 'Trò chơi Trí Nhớ (Memory Match)! Tìm các cặp hình giống nhau.',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        // Setup Grid
        let deck = [...MEM_EMOJIS, ...MEM_EMOJIS];
        deck = deck.sort(() => Math.random() - 0.5); // Shuffle

        // Game State
        const grid = deck.map((emoji, i) => ({
            id: i,
            emoji: emoji,
            revealed: false,
            matched: false
        }));

        let firstPick = null;
        let isProcessing = false;
        let pairsFound = 0;
        let attempts = 0;
        const startTime = Date.now();

        const getButtonGrid = (gameOver = false) => {
            const rows = [];
            for (let r = 0; r < 4; r++) {
                const row = new ActionRowBuilder();
                for (let c = 0; c < 4; c++) {
                    const idx = r * 4 + c;
                    const cell = grid[idx];

                    const btn = new ButtonBuilder()
                        .setCustomId(`mem_${idx}`)
                        .setStyle(cell.matched ? ButtonStyle.Success : (cell.revealed ? ButtonStyle.Primary : ButtonStyle.Secondary))
                        .setEmoji(cell.revealed || cell.matched || gameOver ? cell.emoji : '❓')
                        .setDisabled(cell.matched || gameOver);

                    row.addComponents(btn);
                }
                rows.push(row);
            }
            return rows;
        };

        const embed = new EmbedBuilder()
            .setTitle(t('memory.title', lang))
            .setDescription(t('memory.description', lang))
            .setColor(config.COLORS.SCHEDULED)
            .setFooter({ text: t('memory.footer', lang) });

        const reply = await message.reply({ embeds: [embed], components: getButtonGrid() });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120_000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            if (isProcessing) return i.reply({ content: t('memory.wait', lang), ephemeral: true });

            const idx = parseInt(i.customId.split('_')[1]);
            const cell = grid[idx];

            if (cell.revealed || cell.matched) return i.deferUpdate();

            // Reveal
            cell.revealed = true;

            if (firstPick === null) {
                // First card picked
                firstPick = idx;
                await i.update({ components: getButtonGrid() });
            } else {
                // Second card picked
                attempts++;

                // Grant Action XP
                const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                addXp(message.author.id, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min);

                const firstCell = grid[firstPick];

                if (firstCell.emoji === cell.emoji) {
                    // Match!
                    firstCell.matched = true;
                    cell.matched = true;
                    firstCell.revealed = true; // Stay revealed
                    cell.revealed = true;
                    firstPick = null;
                    pairsFound++;

                    if (pairsFound === 8) {
                        collector.stop('win');
                        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);

                        // Calculate Reward
                        let reward = config.ECONOMY.MEMORY_REWARD_BASE;
                        if (attempts > 12) reward = Math.max(10, reward - ((attempts - 12) * 5));

                        // Time bonus
                        if (timeTaken < 30) reward += 50;
                        else if (timeTaken < 60) reward += 20;

                        const { total: totalReward, bonus: bonusAmount, cap } = calculateReward(reward, message.author.id);

                        db.addBalance(message.author.id, totalReward);

                        // Grant Win XP
                        const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                        const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                        addXp(message.author.id, winXp);

                        let winDesc = t('memory.win_msg', lang, { time: timeTaken, attempts: attempts, emoji: config.EMOJIS.COIN, reward: totalReward });
                        if (bonusAmount > 0) winDesc += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), cap });

                        embed.setTitle(t('memory.win_title', lang))
                            .setDescription(winDesc)
                            .setColor(config.COLORS.SUCCESS);

                        await i.update({ embeds: [embed], components: getButtonGrid(true) });
                        startCooldown(message.client, 'memory', message.author.id);
                    } else {
                        await i.update({ components: getButtonGrid() });
                    }
                } else {
                    // Mismatch
                    isProcessing = true;
                    await i.update({ components: getButtonGrid() });

                    setTimeout(async () => {
                        if (firstPick !== null) { // Defensive check
                            grid[firstPick].revealed = false;
                        }
                        cell.revealed = false;
                        firstPick = null;
                        isProcessing = false;
                        await reply.edit({ components: getButtonGrid() }).catch(() => { });
                    }, 1000);
                }
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                embed.setTitle(t('memory.timeout', lang)).setColor(config.COLORS.ERROR);
                reply.edit({ embeds: [embed], components: getButtonGrid(true) }).catch(() => { });
                startCooldown(message.client, 'memory', message.author.id);
            }
        });
    }
};
