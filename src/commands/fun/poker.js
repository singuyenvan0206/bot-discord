const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database');
const { Deck, evaluateHand } = require('../../utils/pokerLogic');
const { startCooldown } = require('../../utils/cooldown');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'poker',
    aliases: ['pk'],
    description: 'Play Texas Hold\'em Poker!',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id);
        const user = db.getUser(message.author.id);
        const { parseAmount } = require('../../utils/economy');
        const minBuyIn = args[0] ? parseAmount(args[0], user.balance) : 50;
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
        let phase = t('poker.phases.lobby', lang);

        const lobbyEmbed = new EmbedBuilder()
            .setTitle(t('poker.title', lang))
            .setDescription(t('poker.lobby_desc', lang, {
                host: message.author.toString(),
                emoji: config.EMOJIS.COIN,
                min: minBuyIn,
                count: 0,
                list: t('poker.waiting_players', lang)
            }))
            .setColor(config.COLORS.SUCCESS)
            .setFooter({ text: t('poker.min_players_note', lang) });

        function getLobbyButtons() {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`join_poker_${hostId}`).setLabel(t('poker.btn_join', lang)).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`add_bot_poker_${hostId}`).setLabel(t('poker.btn_add_bot', lang)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`leave_poker_${hostId}`).setLabel(t('poker.btn_leave', lang)).setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`start_poker_${hostId}`).setLabel(t('poker.btn_start', lang)).setStyle(ButtonStyle.Primary)
            );
        }

        const reply = await message.reply({ embeds: [lobbyEmbed], components: [getLobbyButtons()] });

        // Lobby Collector
        const lobbyCollector = reply.createMessageComponentCollector({ time: 300_000 });

        lobbyCollector.on('collect', async i => {
            if (i.customId === `join_poker_${hostId}`) {
                if (gameStarted) return i.reply({ content: t('poker.already_started', lang), flags: 64 });
                if (playerMap.has(i.user.id)) return i.reply({ content: t('poker.already_joined', lang), flags: 64 });
                if (joiningPlayers.has(i.user.id)) return i.reply({ content: t('poker.joining_process', lang), flags: 64 });

                // Show Modal
                const modal = new ModalBuilder()
                    .setCustomId(`buyin_modal_${i.user.id}`)
                    .setTitle(t('poker.buyin_modal', lang));

                const input = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel(t('poker.buyin_amount_label', lang, { min: minBuyIn }))
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
                    const user = db.getUser(i.user.id);
                    const amountStr = submit.fields.getTextInputValue('amount');
                    const amount = parseAmount(amountStr, user.balance);

                    if (isNaN(amount) || amount < minBuyIn) {
                        joiningPlayers.delete(i.user.id);
                        updateLobby();
                        return submit.reply({ content: `${config.EMOJIS.ERROR} ${t('poker.invalid_amount', lang, { min: minBuyIn })}`, flags: 64 });
                    }

                    if (amount > config.ECONOMY.MAX_BET) {
                        joiningPlayers.delete(i.user.id);
                        updateLobby();
                        return submit.reply({ content: `${config.EMOJIS.ERROR} ${t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() })}`, flags: 64 });
                    }


                    if (user.balance < amount) {
                        joiningPlayers.delete(i.user.id);
                        updateLobby();
                        return submit.reply({ content: t('common.insufficient_funds', lang, { balance: user.balance }), flags: 64 });
                    }

                    db.removeBalance(i.user.id, amount);
                    addPlayer(i.user, false, amount);
                    joiningPlayers.delete(i.user.id);
                    updateLobby();
                    await submit.deferUpdate();

                } catch (e) {
                    joiningPlayers.delete(i.user.id);
                    updateLobby();
                }

            } else if (i.customId === `add_bot_poker_${hostId}`) {
                if (i.user.id !== hostId) return i.reply({ content: t('poker.host_only_bot', lang), flags: 64 });
                if (gameStarted) return i.reply({ content: t('poker.already_started', lang), flags: 64 });

                await i.deferUpdate().catch(() => { });
                addPlayer(null, true, minBuyIn); // Bots buy in for min
                updateLobby();

            } else if (i.customId === `leave_poker_${hostId}`) {
                if (gameStarted) return i.reply({ content: t('poker.cannot_leave', lang), flags: 64 });
                if (!playerMap.has(i.user.id)) return i.reply({ content: t('poker.not_in_game', lang), flags: 64 });

                await i.deferUpdate().catch(() => { });
                const p = playerMap.get(i.user.id);
                if (!p.isBot) db.addBalance(p.id, p.chips); // Refund chips

                removePlayer(i.user.id);
                updateLobby();

            } else if (i.customId === `start_poker_${hostId}`) {
                if (i.user.id !== hostId) return i.reply({ content: t('poker.host_only_start', lang), flags: 64 });
                if (joiningPlayers.size > 0) return i.reply({ content: t('poker.wait_joining', lang), flags: 64 });
                if (players.length < 2) return i.reply({ content: t('poker.need_players', lang), flags: 64 });

                await i.deferUpdate().catch(() => { });
                gameStarted = true;
                lobbyCollector.stop('started');
                startGame();
            }
        });

        lobbyCollector.on('end', (_, reason) => {
            if (reason !== 'started') {
                players.forEach(p => { if (!p.isBot) db.addBalance(p.id, p.chips); });
                reply.edit({ content: t('poker.lobby_timeout', lang), components: [] }).catch(() => { });
            }
        });

        function addPlayer(user, isBot, amount) {
            const tempId = isBot ? `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}` : user.id;
            const newPlayer = {
                id: tempId,
                name: isBot ? `${config.EMOJIS.BOT || '🤖'} Bot ${players.length + 1}` : user.username,
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
                playerList.push(t('poker.player_item', lang, { name, chips: p.chips }));
            });

            if (joiningPlayers.size > 0) {
                joiningPlayers.forEach(id => playerList.push(t('poker.joining', lang, { name: `<@${id}>` })));
            }

            const listStr = playerList.length > 0 ? playerList.join('\n') : t('poker.waiting_players', lang);

            lobbyEmbed.setDescription(t('poker.lobby_desc', lang, {
                host: message.author.toString(),
                emoji: config.EMOJIS.COIN,
                min: minBuyIn,
                count: players.length + joiningPlayers.size,
                list: listStr
            }));
            reply.edit({ embeds: [lobbyEmbed], components: [getLobbyButtons()] }).catch(() => { });
        }

        // --- Game Logic ---

        async function startGame() {
            deck = new Deck();
            deck.shuffle();
            pot = 0;
            communityCards = [];
            dealerIndex = Math.floor(Math.random() * players.length);

            // Deal Hands
            for (const p of players) {
                p.hand = deck.deal(2);
                p.currentBet = 0;
                p.folded = false;
                p.allIn = false;
                p.hasActed = false;

                if (!p.isBot) {
                    try {
                        await p.user.send(t('poker.private_hand_dm', lang, {
                            cards: `${p.hand[0]} ${p.hand[1]}`,
                            channel: `<#${message.channel.id}>`
                        }));
                    } catch (e) { }
                }
            }

            // Phase 1: Pre-Flop
            phase = t('poker.phases.preflop', lang);

            const ante = Math.max(1, Math.floor(minBuyIn * 0.05));
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

            if (toCall === 0) action = 'check';
            else if (r > 0.8) action = 'raise';
            else if (r > 0.3) action = 'call';
            else action = 'fold';

            if (action === 'fold' && toCall === 0) action = 'check';

            if (action === 'raise') {
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
            if (!p) return i.reply({ content: t('poker.not_in_game', lang), flags: 64 });

            if (players[turnIndex].id !== p.id) {
                return i.reply({ content: t('poker.not_your_turn', lang, { name: players[turnIndex].name }), flags: 64 });
            }

            const action = i.customId;

            if (action === 'raise') {
                const modal = new ModalBuilder()
                    .setCustomId(`raise_modal_${i.user.id}`)
                    .setTitle(t('poker.raise_modal_title', lang));

                const minTotal = currentBet + Math.max(10, Math.floor(minBuyIn * 0.1));

                const input = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel(t('poker.raise_amount_label', lang, { min: minTotal }))
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`${minTotal}`)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await i.showModal(modal);

                try {
                    const submit = await i.awaitModalSubmit({ time: 30000, filter: s => s.customId === `raise_modal_${i.user.id}` });
                    const val = parseAmount(submit.fields.getTextInputValue('amount'), p.chips + p.currentBet);

                    if (isNaN(val) || val < minTotal) {
                        return submit.reply({ content: `❌ ${t('poker.invalid_raise', lang, { min: minTotal })}`, flags: 64 });
                    }
                    if (val > config.ECONOMY.MAX_BET) {
                        return submit.reply({ content: t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() }), flags: 64 });
                    }
                    if (val > p.chips + p.currentBet) {
                        return submit.reply({ content: t('common.insufficient_funds', lang, { balance: p.chips + p.currentBet }), flags: 64 });
                    }

                    await submit.deferUpdate();
                    handleAction(p, 'raise', null, val);

                } catch (e) { }

            } else if (action === 'allin') {
                await i.deferUpdate().catch(() => { });
                handleAction(p, 'allin');
            } else {
                await i.deferUpdate().catch(() => { });
                handleAction(p, action);
            }
        });

        async function handleAction(player, action, interaction = null, numericValue = 0) {
            const toCall = currentBet - player.currentBet;

            if (action === 'fold') {
                player.folded = true;
            }
            else if (action === 'call' || action === 'check') {
                const amount = Math.min(player.chips, toCall);
                player.chips -= amount;
                player.currentBet += amount;
                pot += amount;
                player.hasActed = true;

                if (player.chips === 0) player.allIn = true;
            }
            else if (action === 'raise') {
                let targetTotal = player.isBot ? currentBet + numericValue : numericValue;
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
            } else if (action === 'allin') {
                const amount = player.chips;
                player.chips = 0;
                player.currentBet += amount;
                pot += amount;
                player.allIn = true;
                player.hasActed = true;

                if (player.currentBet > currentBet) {
                    currentBet = player.currentBet;
                    players.forEach(op => { if (op.id !== player.id && !op.folded && !op.allIn) op.hasActed = false; });
                }
            }

            turnIndex = (turnIndex + 1) % players.length;
            processTurn();
        }

        function getActionRow(currentPlayer) {
            if (phase === t('poker.phases.showdown', lang)) return [];
            const toCall = currentBet - (currentPlayer ? currentPlayer.currentBet : 0);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fold').setLabel(t('poker.action_fold', lang)).setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('call').setLabel(toCall === 0 ? t('poker.action_check', lang) : t('poker.action_call', lang, { amount: toCall })).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('raise').setLabel(t('poker.action_raise', lang)).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('allin').setLabel(t('poker.action_allin', lang)).setStyle(ButtonStyle.Danger)
            );
            return [row];
        }

        async function updateTable() {
            const activeP = players[turnIndex];
            const cardsStr = communityCards.length > 0 ? communityCards.map(c => c.toString()).join(' ') : `[ ${t('poker.waiting_label', lang)} ]`;

            const statusTxt = players.map(p => {
                let s = p.isBot ? p.name : `<@${p.id}>`;
                s += ` (💰${p.chips})`;
                if (p.folded) s += ` [${t('poker.status_folded', lang)}]`;
                else if (p.allIn) s += ` [${t('poker.status_allin', lang)}]`;
                else if (activeP && p.id === activeP.id) s += ` 👈 **${t('poker.status_turn', lang)}**`;

                if (p.currentBet > 0) s += ` [${t('poker.status_bet', lang)}: ${p.currentBet}]`;
                return s;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${t('poker.title', lang)} - ${phase}`)
                .setDescription(`**${t('poker.community_cards', lang)}:** ${cardsStr}\n\n**${t('poker.pot', lang, { amount: pot })}\n**${t('poker.current_bet', lang, { amount: currentBet })}\n\n${statusTxt}`)
                .setColor(config.COLORS.INFO);

            const components = (activeP && !activeP.isBot) ? getActionRow(activeP) : [];
            await reply.edit({ embeds: [embed], components }).catch(() => { });
        }

        async function nextPhase() {
            players.forEach(p => { p.currentBet = 0; p.hasActed = false; });
            currentBet = 0;

            if (phase === t('poker.phases.preflop', lang)) {
                phase = t('poker.phases.flop', lang);
                communityCards.push(...deck.deal(3));
            } else if (phase === t('poker.phases.flop', lang)) {
                phase = t('poker.phases.turn', lang);
                communityCards.push(...deck.deal(1));
            } else if (phase === t('poker.phases.turn', lang)) {
                phase = t('poker.phases.river', lang);
                communityCards.push(...deck.deal(1));
            } else if (phase === t('poker.phases.river', lang)) {
                endRound();
                return;
            }
            startBettingRound();
        }

        async function endRound() {
            gameCollector.stop();
            phase = t('poker.phases.showdown', lang);

            const active = players.filter(p => !p.folded);
            let winners = [];
            let resultText = '';

            if (active.length === 1) {
                winners = [active[0]];
                resultText = t('poker.win_by_fold', lang, { user: active[0].name });
            } else {
                let bestScore = -1;
                const results = [];
                for (const p of active) {
                    const evalRes = evaluateHand(p.hand, communityCards, lang);
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
                .setTitle(t('poker.end_title', lang))
                .setDescription(`**${t('poker.winners', lang, { names: winnerNames })}\n**${t('poker.pot', lang, { amount: pot })}\n\n${resultText}`)
                .setColor(config.COLORS.WARNING);

            await reply.edit({ embeds: [embed], components: [] });
            players.forEach(p => {
                if (!p.isBot) startCooldown(message.client, 'poker', p.id);
            });
        }
    }
};
