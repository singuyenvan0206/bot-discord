const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database');
const { Deck, evaluateHand } = require('../../utils/pokerLogic');
const { startCooldown } = require('../../utils/cooldown');

module.exports = {
    name: 'poker',
    aliases: ['pk'],
    description: 'Texas Hold\'em Poker (Modals)',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const minBuyIn = parseInt(args[0]) || 50; // Default
        const hostId = message.author.id;

        // Game State
        const players = [];
        const playerMap = new Map();
        const joiningPlayers = new Set(); // Track users currently in modal

        let gameStarted = false;
        let communityCards = [];
        let deck = null;
        let pot = 0;
        let currentBet = 0;
        let dealerIndex = 0;
        let turnIndex = 0;
        let phase = 'Lobby';

        const lobbyEmbed = new EmbedBuilder()
            .setTitle('♠️♥️ Texas Hold\'em (Advanced) ♦️♣️')
            .setDescription(`**Host:** ${message.author}\n**Min Buy-in:** 💰 ${minBuyIn}\n\n**Players (0):**\nWaiting for players...\n\n*Click Join to sit at the table!*`)
            .setColor(0x2ECC71)
            .setFooter({ text: 'Minimum 2 players to start' });

        function getLobbyButtons() {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`join_poker_${hostId}`).setLabel('Join Table').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`add_bot_poker_${hostId}`).setLabel('Add Bot').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`leave_poker_${hostId}`).setLabel('Leave').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`start_poker_${hostId}`).setLabel('Start Game').setStyle(ButtonStyle.Primary)
            );
        }

        const reply = await message.reply({ embeds: [lobbyEmbed], components: [getLobbyButtons()] });

        // Lobby Collector
        const lobbyCollector = reply.createMessageComponentCollector({ time: 300_000 });

        lobbyCollector.on('collect', async i => {
            if (i.customId === `join_poker_${hostId}`) {
                if (gameStarted) return i.reply({ content: '❌ Game already started!', flags: 64 });
                if (playerMap.has(i.user.id)) return i.reply({ content: '❌ You already joined!', flags: 64 });
                if (joiningPlayers.has(i.user.id)) return i.reply({ content: '❌ You are already joining...', flags: 64 });

                // Show Modal
                const modal = new ModalBuilder()
                    .setCustomId(`buyin_modal_${i.user.id}`)
                    .setTitle('Poker Buy-in');

                const input = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel(`Amount (Min: ${minBuyIn})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`${minBuyIn}`)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await i.showModal(modal);
                joiningPlayers.add(i.user.id);
                updateLobby(); // Update "Joining..." status

                // Wait for submit
                try {
                    const submit = await i.awaitModalSubmit({ time: 30000, filter: s => s.customId === `buyin_modal_${i.user.id}` });
                    const amount = parseInt(submit.fields.getTextInputValue('amount'));

                    if (isNaN(amount) || amount < minBuyIn) {
                        joiningPlayers.delete(i.user.id);
                        updateLobby();
                        return submit.reply({ content: `❌ Invalid Amount! Must be at least ${minBuyIn}.`, flags: 64 });
                    }

                    const user = db.getUser(i.user.id);
                    if (user.balance < amount) {
                        joiningPlayers.delete(i.user.id);
                        updateLobby();
                        return submit.reply({ content: `❌ Insufficient funds! You have ${user.balance}.`, flags: 64 });
                    }

                    db.removeBalance(i.user.id, amount);
                    addPlayer(i.user, false, amount);
                    joiningPlayers.delete(i.user.id);
                    updateLobby();
                    await submit.deferUpdate();

                } catch (e) {
                    joiningPlayers.delete(i.user.id);
                    updateLobby();
                    // console.error(e); // Modal timed out or error
                }

            } else if (i.customId === `add_bot_poker_${hostId}`) {
                if (i.user.id !== hostId) return i.reply({ content: '❌ Only host can add bots.', flags: 64 });
                if (gameStarted) return i.reply({ content: '❌ Game already started.', flags: 64 });

                await i.deferUpdate().catch(() => { });
                addPlayer(null, true, minBuyIn); // Bots buy in for min
                updateLobby();

            } else if (i.customId === `leave_poker_${hostId}`) {
                if (gameStarted) return i.reply({ content: '❌ Cannot leave active game.', flags: 64 });
                if (!playerMap.has(i.user.id)) return i.reply({ content: '❌ You are not in the game.', flags: 64 });

                await i.deferUpdate().catch(() => { });
                const p = playerMap.get(i.user.id);
                if (!p.isBot) db.addBalance(p.id, p.chips); // Refund chips

                removePlayer(i.user.id);
                updateLobby();

            } else if (i.customId === `start_poker_${hostId}`) {
                if (i.user.id !== hostId) return i.reply({ content: '❌ Only host can start.', flags: 64 });
                if (joiningPlayers.size > 0) return i.reply({ content: '❌ Someone is joining! Please wait.', flags: 64 });
                if (players.length < 2) return i.reply({ content: '❌ Need 2+ players!', flags: 64 });

                await i.deferUpdate().catch(() => { });
                gameStarted = true;
                lobbyCollector.stop('started');
                startGame();
            }
        });

        lobbyCollector.on('end', (_, reason) => {
            if (reason !== 'started') {
                players.forEach(p => { if (!p.isBot) db.addBalance(p.id, p.chips); });
                reply.edit({ content: '⏰ Lobby timed out. Refunds issued.', components: [] }).catch(() => { });
            }
        });

        function addPlayer(user, isBot, amount) {
            const tempId = isBot ? `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}` : user.id;
            const newPlayer = {
                id: tempId,
                name: isBot ? `🤖 Bot ${players.length + 1}` : user.username,
                isBot,
                user: user,
                hand: [],
                chips: amount,
                currentBet: 0,
                folded: false,
                allIn: false,
                hasActed: false
            };
            players.push(newPlayer);
            playerMap.set(tempId, newPlayer);
        }

        function removePlayer(id) {
            const index = players.findIndex(p => p.id === id);
            if (index > -1) players.splice(index, 1);
            playerMap.delete(id);
        }

        function updateLobby() {
            const playerList = [];
            players.forEach(p => {
                const name = p.isBot ? p.name : `<@${p.id}>`;
                playerList.push(`${name} (💰${p.chips})`);
            });

            if (joiningPlayers.size > 0) {
                joiningPlayers.forEach(id => playerList.push(`<@${id}> (Joining...)`));
            }

            const listStr = playerList.length > 0 ? playerList.join('\n') : 'Waiting for players...';

            lobbyEmbed.setDescription(`**Host:** ${message.author}\n**Min Buy-in:** 💰 ${minBuyIn}\n\n**Players (${players.length + joiningPlayers.size}):**\n${listStr}\n\n*Click Join to sit at the table!*`);
            reply.edit({ embeds: [lobbyEmbed], components: [getLobbyButtons()] }).catch(() => { });
        }

        // --- Game Logic ---

        async function startGame() {
            deck = new Deck();
            deck.shuffle();
            pot = 0;
            communityCards = [];
            dealerIndex = Math.floor(Math.random() * players.length);
            activePlayersCount = players.length;

            // Deal Hands
            for (const p of players) {
                p.hand = deck.deal(2);
                p.currentBet = 0;
                p.folded = false;
                p.allIn = false;
                p.hasActed = false;

                if (!p.isBot) {
                    try {
                        await p.user.send(`🃏 **Your Poker Hand:** ${p.hand[0]} ${p.hand[1]}\nGame in <#${message.channel.id}>`);
                    } catch (e) {
                        // ignore
                    }
                }
            }

            // Phase 1: Pre-Flop
            phase = 'Pre-Flop';
            // Blinds/Ante
            const ante = Math.max(1, Math.floor(minBuyIn * 0.05));
            let anteMsg = `Ante: ${ante}\n`;

            players.forEach(p => {
                const contribution = Math.min(p.chips, ante);
                p.chips -= contribution;
                pot += contribution;
            });

            startBettingRound();
        }

        async function startBettingRound() {
            players.forEach(p => {
                p.currentBet = 0;
                p.hasActed = false;
            });
            currentBet = 0;
            lastAggressorIndex = -1;
            turnIndex = (dealerIndex + 1) % players.length;
            updateTable();
            processTurn();
        }

        async function processTurn() {
            const activePlayers = players.filter(p => !p.folded && !p.allIn);
            const nonFolded = players.filter(p => !p.folded);

            if (nonFolded.length === 1) {
                endRound();
                return;
            }

            const allMatched = activePlayers.every(p => p.currentBet === currentBet);
            const allActed = activePlayers.every(p => p.hasActed);

            if (activePlayers.length === 0 || (allActed && allMatched)) {
                nextPhase();
                return;
            }

            let loopCount = 0;
            while (players[turnIndex].folded || players[turnIndex].allIn) {
                turnIndex = (turnIndex + 1) % players.length;
                loopCount++;
                if (loopCount > players.length) { nextPhase(); return; }
            }

            const player = players[turnIndex];
            updateTable();

            if (player.isBot) {
                setTimeout(() => playBot(player), 1500 + Math.random() * 1000);
            }
        }

        async function playBot(bot) {
            const toCall = currentBet - bot.currentBet;
            let action = 'fold';
            const r = Math.random();

            // Simple Logic
            if (toCall === 0) action = 'check';
            else if (r > 0.8) action = 'raise';
            else if (r > 0.3) action = 'call';
            else action = 'fold';

            if (action === 'fold' && toCall === 0) action = 'check';

            if (action === 'raise') {
                // Determine raise amount (min raise or random)
                const minRaise = Math.max(10, Math.floor(minBuyIn * 0.1));
                handleAction(bot, 'raise', null, minRaise);
            } else {
                handleAction(bot, action);
            }
        }

        const gameCollector = reply.createMessageComponentCollector({ time: 600_000 });

        gameCollector.on('collect', async i => {
            if (!gameStarted) return;
            const p = playerMap.get(i.user.id);
            if (!p) return i.reply({ content: '❌ Not in game.', flags: 64 });

            if (players[turnIndex].id !== p.id) {
                return i.reply({ content: `❌ It's **${players[turnIndex].name}**'s turn!`, flags: 64 });
            }

            const action = i.customId;

            if (action === 'raise') {
                const modal = new ModalBuilder()
                    .setCustomId(`raise_modal_${i.user.id}`)
                    .setTitle('Raise Bet');

                const minTotal = currentBet + Math.max(10, Math.floor(minBuyIn * 0.1));

                const input = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel(`Raise Total To (Min: ${minTotal})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`${minTotal}`)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await i.showModal(modal);

                try {
                    const submit = await i.awaitModalSubmit({ time: 30000, filter: s => s.customId === `raise_modal_${i.user.id}` });
                    const val = parseInt(submit.fields.getTextInputValue('amount'));

                    if (isNaN(val) || val < minTotal) {
                        return submit.reply({ content: `❌ Invalid Raise! Must be at least ${minTotal}.`, flags: 64 });
                    }
                    if (val > p.chips + p.currentBet) {
                        return submit.reply({ content: `❌ Not enough chips! You have ${p.chips + p.currentBet} total.`, flags: 64 });
                    }

                    await submit.deferUpdate();
                    handleAction(p, 'raise', null, val);

                } catch (e) {
                    // console.error(e); 
                }

            } else {
                await i.deferUpdate().catch(() => { });
                handleAction(p, action);
            }
        });

        async function handleAction(player, action, interaction = null, numericValue = 0) {
            const toCall = currentBet - player.currentBet;
            let msg = '';

            if (action === 'fold') {
                player.folded = true;
                msg = `❌ **${player.name}** Folded.`;
            }
            else if (action === 'call' || action === 'check') {
                const amount = Math.min(player.chips, toCall);
                player.chips -= amount;
                player.currentBet += amount;
                pot += amount;
                player.hasActed = true;

                if (player.chips === 0) player.allIn = true;
                msg = amount === 0 ? `✅ **${player.name}** Checked.` : `💸 **${player.name}** Called ${amount}.`;
            }
            else if (action === 'raise') {
                let targetTotal = 0;

                if (player.isBot) {
                    targetTotal = currentBet + numericValue;
                } else {
                    targetTotal = numericValue;
                }

                const needed = targetTotal - player.currentBet;
                const actualAdd = Math.min(player.chips, needed);

                player.chips -= actualAdd;
                player.currentBet += actualAdd;
                pot += actualAdd;
                player.hasActed = true;

                if (player.currentBet > currentBet) {
                    currentBet = player.currentBet;
                    players.forEach(op => { if (op.id !== player.id && !op.folded && !op.allIn) op.hasActed = false; });
                }

                if (player.chips === 0) player.allIn = true;
                msg = `📈 **${player.name}** Raised to ${player.currentBet}!`;
            }

            turnIndex = (turnIndex + 1) % players.length;
            processTurn();
        }

        function getActionRow(currentPlayer) {
            if (phase === 'Showdown') return [];
            const toCall = currentBet - (currentPlayer ? currentPlayer.currentBet : 0);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fold').setLabel('Fold').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('call').setLabel(toCall === 0 ? 'Check' : `Call ${toCall}`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('raise').setLabel('Raise').setStyle(ButtonStyle.Primary)
            );
            return [row];
        }

        async function updateTable() {
            const activeP = players[turnIndex];
            const cardsStr = communityCards.length > 0 ? communityCards.map(c => c.toString()).join(' ') : '[ Waiting... ]';

            const statusTxt = players.map(p => {
                let s = p.isBot ? p.name : `<@${p.id}>`;
                s += ` (💰${p.chips})`;
                if (p.folded) s += ' [FOLD]';
                else if (p.allIn) s += ' [ALL-IN]';
                else if (p.id === activeP.id) s += ' 👈 **TURN**';

                if (p.currentBet > 0) s += ` [Bet: ${p.currentBet}]`;
                return s;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`♥️ Texas Hold'em - ${phase}`)
                .setDescription(`**Community:**\nsp# ${cardsStr}sp\n\n**Pot:** 💰 ${pot}\n**Current Bet:** ${currentBet}\n\n${statusTxt}`.replace(/sp/g, ' '))
                .setColor(0x3498DB);

            const components = (!activeP.isBot) ? getActionRow(activeP) : [];
            await reply.edit({ embeds: [embed], components }).catch(() => { });
        }

        async function nextPhase() {
            players.forEach(p => { p.currentBet = 0; p.hasActed = false; });
            currentBet = 0;

            if (phase === 'Pre-Flop') {
                phase = 'Flop';
                communityCards.push(...deck.deal(3));
            } else if (phase === 'Flop') {
                phase = 'Turn';
                communityCards.push(...deck.deal(1));
            } else if (phase === 'Turn') {
                phase = 'River';
                communityCards.push(...deck.deal(1));
            } else if (phase === 'River') {
                endRound();
                return;
            }
            startBettingRound();
        }

        async function endRound() {
            gameCollector.stop();
            phase = 'Showdown';

            const active = players.filter(p => !p.folded);
            let winners = [];
            let resultText = '';

            if (active.length === 1) {
                winners = [active[0]];
                resultText = `${active[0].name} wins (others folded)!`;
            } else {
                let bestScore = -1;
                const results = [];
                for (const p of active) {
                    const evalRes = evaluateHand(p.hand, communityCards);
                    results.push({ p, evalRes });
                    if (evalRes.score > bestScore) {
                        bestScore = evalRes.score;
                        winners = [p];
                    } else if (evalRes.score === bestScore) {
                        winners.push(p);
                    }
                }
                resultText = results
                    .sort((a, b) => b.evalRes.score - a.evalRes.score)
                    .map(r => `${r.p.name}: ${r.p.hand.join('')} -> **${r.evalRes.name}**`)
                    .join('\n');
            }

            const prize = Math.floor(pot / winners.length);
            winners.forEach(w => { w.chips += prize; });

            players.forEach(p => {
                if (!p.isBot && p.chips > 0) db.addBalance(p.id, p.chips);
            });

            const winnerNames = winners.map(w => w.name).join(', ');
            const embed = new EmbedBuilder()
                .setTitle('🏆 Game Over')
                .setDescription(`**Winner(s):** ${winnerNames}\n**Pot:** ${pot}\n\n${resultText}`)
                .setColor(0xF1C40F);

            await reply.edit({ embeds: [embed], components: [] });
            players.forEach(p => {
                if (!p.isBot) startCooldown(message.client, 'poker', p.id);
            });
        }
    }
};
