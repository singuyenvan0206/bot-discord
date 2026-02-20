const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');

const EMOJIS = ['🍎', '🍌', '🍒', '🍇', '🍉', '🍓', '🍑', '🍍'];

module.exports = {
    name: 'memory',
    aliases: ['mem', 'match'],
    description: 'Play Memory Match! (Find all pairs)',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        // Setup Grid
        let deck = [...EMOJIS, ...EMOJIS];
        deck = deck.sort(() => Math.random() - 0.5); // Shuffle

        // Game State
        const gridSize = 16;
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
            .setTitle('🧠 Memory Match')
            .setDescription('Find all matching pairs! Click buttons to reveal cards.')
            .setColor(0x9B59B6)
            .setFooter({ text: 'Time Limit: 2 Minutes' });

        const reply = await message.reply({ embeds: [embed], components: getButtonGrid() });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120_000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            if (isProcessing) return i.reply({ content: '⏳ Please wait...', ephemeral: true });

            const idx = parseInt(i.customId.split('_')[1]);
            const cell = grid[idx];

            if (cell.revealed || cell.matched) return i.deferUpdate();

            // Reveal
            cell.revealed = true;

            if (!firstPick) {
                // First card picked
                firstPick = idx;
                await i.update({ components: getButtonGrid() });
            } else {
                // Second card picked
                attempts++;
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
                        // Base 50, -1 per attempt over 12?
                        // Bonus for fast time
                        let reward = 100;
                        if (attempts > 12) reward = Math.max(10, reward - ((attempts - 12) * 5));

                        // Time bonus
                        if (timeTaken < 30) reward += 50;
                        else if (timeTaken < 60) reward += 20;

                        db.addBalance(message.author.id, reward);

                        embed.setTitle('🎉 Victory!')
                            .setDescription(`**You found all pairs!**\n\n⏱️ Time: **${timeTaken}s**\n🔄 Attempts: **${attempts}**\n💰 Reward: **${reward} coins**`)
                            .setColor(0x2ECC71);

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
                        firstCell.revealed = false;
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
                embed.setTitle('⏰ Time\'s Up!').setColor(0xE74C3C);
                reply.edit({ embeds: [embed], components: getButtonGrid(true) }).catch(() => { });
                startCooldown(message.client, 'memory', message.author.id);
            }
        });
    }
};
