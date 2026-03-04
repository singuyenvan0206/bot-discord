const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../../database');
const { Deck, evaluateHand } = require('../../utils/pokerLogic');
const { startCooldown } = require('../../utils/cooldown');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { calculateReward } = require('../../utils/multiplier');
const { addXp, XP_AMOUNTS, sendLevelUpMessage } = require('../../utils/leveling');
const { parseAmount, addHouseProfit, getMaxBet } = require('../../utils/economy');

module.exports = {
    name: 'poker',
    aliases: ['pk'],
    description: 'Xì tố (Play Texas Hold\'em Poker)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const maxBet = await getMaxBet(message.author.id);
        let minBuyIn = Math.max(50, args[0] ? parseAmount(args[0], user.balance, maxBet) : 50);
        let maxBuyIn = Math.min(maxBet, args[1] ? parseAmount(args[1], user.balance, maxBet) : maxBet);
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
        let gameThread = null; // Store thread reference

        const lobbyEmbed = new EmbedBuilder()
            .setTitle(t('poker.title', lang))
            .setDescription(t('poker.lobby_desc', lang, {
                host: message.author.toString(),
                emoji: config.EMOJIS.COIN,
                min: minBuyIn.toLocaleString(),
                count: 0,
                list: t('poker.waiting_players', lang)
            }))
            .setColor(config.COLORS.SUCCESS)
            .setFooter({ text: t('poker.min_players_note', lang) });

        function getLobbyButtons() {
            const rows = [];
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`join_poker_${hostId}`).setLabel(t('poker.btn_join', lang)).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`leave_poker_${hostId}`).setLabel(t('poker.btn_leave', lang)).setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`add_bot_poker_${hostId}`).setLabel(t('poker.btn_add_bot', lang)).setStyle(ButtonStyle.Secondary)
            );
            rows.push(row1);

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ready_poker_${hostId}`).setLabel(t('poker.btn_ready', lang)).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`settings_poker_${hostId}`).setLabel(t('poker.btn_adjust_buyin', lang)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`start_poker_${hostId}`).setLabel(t('poker.btn_start', lang)).setStyle(ButtonStyle.Success)
            );
            rows.push(row2);

            return rows;
        }

        let reply = await message.reply({ embeds: [lobbyEmbed], components: getLobbyButtons() });

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
                    .setLabel(t('poker.buyin_amount_label', lang, { min: minBuyIn.toLocaleString() }))
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`${minBuyIn.toLocaleString()}`)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));

                await i.showModal(modal);
                joiningPlayers.add(i.user.id);
                updateLobby(); // Update "Joining..." status

                // Wait for submit
                try {
                    const submit = await i.awaitModalSubmit({ time: 30000, filter: s => s.customId === `buyin_modal_${i.user.id}` });
                    const user = await db.getUser(i.user.id, i.guild.id);
                    const amountStr = submit.fields.getTextInputValue('amount');
                    const amount = parseAmount(amountStr, user.balance, maxBet);

                    if (isNaN(amount) || amount <= 0 || amount < minBuyIn) {
                        joiningPlayers.delete(i.user.id);
                        updateLobby();
                        return submit.reply({ content: `${config.EMOJIS.ERROR} ${t('poker.invalid_amount', lang, { min: minBuyIn })}`, flags: 64 });
                    }

                    if (amount > maxBet) {
                        joiningPlayers.delete(i.user.id);
                        updateLobby();
                        return submit.reply({ content: `${config.EMOJIS.ERROR} ${t('common.max_bet_error', lang, { limit: maxBet.toLocaleString() })}`, flags: 64 });
                    }

                    if (user.balance < amount) {
                        joiningPlayers.delete(i.user.id);
                        updateLobby();
                        return submit.reply({ content: t('common.insufficient_funds', lang, { balance: user.balance.toLocaleString() }), flags: 64 });
                    }

                    await db.removeBalance(i.guild.id, i.user.id, amount);
                    addPlayer(i.user, i.member, false, amount);
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
                const hostPlayer = players.find(p => p.id === hostId);
                const botAmount = hostPlayer ? hostPlayer.chips : minBuyIn;
                addPlayer(null, null, true, botAmount);
                updateLobby();

            } else if (i.customId === `leave_poker_${hostId}`) {
                if (gameStarted) return i.reply({ content: t('poker.cannot_leave', lang), flags: 64 });
                if (!playerMap.has(i.user.id)) return i.reply({ content: t('poker.not_in_game', lang), flags: 64 });

                await i.deferUpdate().catch(() => { });
                const p = playerMap.get(i.user.id);
                if (!p.isBot) await db.addBalance(i.guild.id, p.id, p.chips); // Refund chips

                removePlayer(i.user.id);
                updateLobby();

            } else if (i.customId === `ready_poker_${hostId}`) {
                if (gameStarted) return i.reply({ content: t('poker.already_started', lang), flags: 64 });
                const p = playerMap.get(i.user.id);
                if (!p) return i.reply({ content: t('poker.not_in_game', lang), flags: 64 });

                p.isReady = !p.isReady;
                await i.deferUpdate().catch(() => { });
                updateLobby();

            } else if (i.customId === `settings_poker_${hostId}`) {
                if (i.user.id !== hostId) return i.reply({ content: t('poker.host_only_bot', lang), flags: 64 }); // Shared string
                if (gameStarted) return i.reply({ content: t('poker.already_started', lang), flags: 64 });

                const modal = new ModalBuilder()
                    .setCustomId(`settings_modal_${i.user.id}`)
                    .setTitle(t('poker.btn_adjust_buyin', lang));

                const input = new TextInputBuilder()
                    .setCustomId('min_buyin')
                    .setLabel(t('poker.buyin_amount_label', lang, { min: (10).toLocaleString() }))
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`${minBuyIn.toLocaleString()}`)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await i.showModal(modal);

                try {
                    const submit = await i.awaitModalSubmit({ time: 30_000, filter: s => s.customId === `settings_modal_${i.user.id}` });
                    const val = parseAmount(submit.fields.getTextInputValue('min_buyin'), maxBet);
                    if (isNaN(val) || val < 10) return submit.reply({ content: t('poker.invalid_amount', lang, { min: 10 }), flags: 64 });

                    minBuyIn = Math.max(10, val);
                    await submit.deferUpdate().catch(() => { });
                    updateLobby();
                } catch (e) { }

            } else if (i.customId === `start_poker_${hostId}`) {
                if (i.user.id !== hostId) return i.reply({ content: t('poker.host_only_start', lang), flags: 64 });
                if (!playerMap.has(hostId)) return i.reply({ content: t('poker.not_in_game', lang), flags: 64 });
                if (joiningPlayers.size > 0) return i.reply({ content: t('poker.wait_joining', lang), flags: 64 });
                if (players.length < 2) return i.reply({ content: t('poker.need_players', lang), flags: 64 });

                const allReady = players.every(p => p.isReady);
                if (!allReady) return i.reply({ content: t('poker.not_all_ready', lang), flags: 64 });

                await i.deferUpdate().catch(() => { });
                gameStarted = true;
                lobbyCollector.stop('started');

                // Create Thread for the game to prevent "drifting"
                if (message.guild.members.me.permissions.has('CreatePublicThreads')) {
                    try {
                        gameThread = await reply.startThread({
                            name: `Poker: ${message.author.username}`,
                            autoArchiveDuration: 60,
                        });
                        // Note: Collector will still be handled in startGame
                    } catch (e) {
                        console.error('[Poker Thread Error]:', e);
                    }
                }

                startGame();
            }
        });

        lobbyCollector.on('end', async (_, reason) => {
            if (reason !== 'started') {
                for (const p of players) {
                    if (!p.isBot) await db.addBalance(message.guild.id, p.id, p.chips);
                }
                reply.edit({ content: t('poker.lobby_timeout', lang), components: [] }).catch(() => { });
            }
        });

        function addPlayer(user, member, isBot, amount) {
            const tempId = isBot ? `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}` : user.id;
            const newPlayer = {
                id: tempId,
                name: isBot ? `${config.EMOJIS.BOT || '🤖'} Bot ${players.length + 1}` : user.username,
                isBot,
                user: user,
                member: member,
                hand: [],
                chips: amount,
                isReady: isBot, // Bots are always ready
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

        const sleep = ms => new Promise(res => setTimeout(res, ms));

        function updateLobby() {
            const playerList = [];
            players.forEach(p => {
                const name = p.isBot ? p.name : `<@${p.id}>`;
                const status = p.isReady ? t('poker.status_ready', lang) : t('poker.status_not_ready', lang);
                playerList.push(t('poker.player_item', lang, { name, chips: p.chips.toLocaleString(), status }));
            });

            if (joiningPlayers.size > 0) {
                joiningPlayers.forEach(id => playerList.push(t('poker.joining', lang, { name: `<@${id}>` })));
            }

            const listStr = playerList.length > 0 ? playerList.join('\n') : t('poker.waiting_players', lang);

            lobbyEmbed.setDescription(t('poker.lobby_desc', lang, {
                host: message.author.toString(),
                emoji: config.EMOJIS.COIN,
                min: minBuyIn.toLocaleString(),
                count: players.length + joiningPlayers.size,
                list: listStr
            }));
            reply.edit({ embeds: [lobbyEmbed], components: getLobbyButtons() }).catch(() => { });
        }

        // --- Game Logic ---

        async function startGame() {
            deck = new Deck();
            deck.shuffle();
            pot = 0;
            communityCards = [];
            dealerIndex = Math.floor(Math.random() * players.length);

            // Sync bot chips with the highest human buy-in at the table
            const humanChips = players.filter(p => !p.isBot).map(p => p.chips);
            const syncAmount = humanChips.length > 0 ? Math.max(...humanChips) : minBuyIn;
            for (const p of players) {
                if (p.isBot) p.chips = syncAmount;
            }

            // Deal Hands
            for (const p of players) {
                p.hand = deck.deal(2);
                p.currentBet = 0;
                p.folded = false;
                p.allIn = false;
                p.hasActed = false;

                // Private cards are now viewed via the "View Cards" button (ephemeral message)
            }

            // Phase 1: Pre-Flop
            phase = t('poker.phases.preflop', lang);

            // Ante: 5% of the smallest stack at the table, minimum 1
            const smallestStack = Math.min(...players.map(p => p.chips));
            const ante = Math.max(1, Math.floor(smallestStack * 0.05));

            players.forEach(p => {
                const contribution = Math.min(p.chips, ante);
                p.chips -= contribution;
                pot += contribution;
                if (p.chips === 0) p.allIn = true;
            });

            await startBettingRound(true); // First round in thread MUST be a repost to bind collector
        }

        async function startBettingRound(forceRepost = false) {
            players.forEach(p => {
                p.currentBet = 0;
                p.hasActed = false;
            });
            currentBet = 0;
            turnIndex = (dealerIndex + 1) % players.length; // Restored original dealer-relative logic
            await updateTable(false);
            await processTurn();
        }

        async function processTurn() {
            const activePlayers = players.filter(p => !p.folded && !p.allIn);
            const nonFolded = players.filter(p => !p.folded);

            if (nonFolded.length === 1) {
                await endRound();
                return;
            }

            const allMatched = activePlayers.every(p => p.currentBet === currentBet);
            const allActed = activePlayers.every(p => p.hasActed);

            if (activePlayers.length === 0 || (allActed && allMatched)) {
                await nextPhase();
                return;
            }

            let loopCount = 0;
            while (players[turnIndex].folded || players[turnIndex].allIn) {
                turnIndex = (turnIndex + 1) % players.length;
                loopCount++;
                if (loopCount > players.length) { await nextPhase(); return; }
            }

            const player = players[turnIndex];
            await updateTable(false);

            if (player.isBot) {
                setTimeout(async () => await playBot(player), 1500 + Math.random() * 1000);
            }
        }

        async function playBot(bot) {
            const toCall = currentBet - bot.currentBet;
            const evalRes = evaluateHand(bot.hand, communityCards, lang);
            const score = evalRes.score;

            let foldChance = 0.25; // Base fold chance
            let raiseChance = 0.15; // Base raise chance

            // Adjust based on hand strength
            if (communityCards.length === 0) { // Pre-flop
                if (score >= 200) foldChance = 0.02; // Pair (e.g. 22 to AA) - extremely rare to fold
                else if (bot.hand.some(c => c.value >= 13)) foldChance = 0.05; // Has an A or K
                else if (bot.hand.some(c => c.value >= 10)) foldChance = 0.15; // J, Q, 10
            } else { // Post-flop
                if (score >= 300) foldChance = 0.01; // Two Pair or better - basically never fold
                else if (score >= 200) foldChance = 0.05; // One Pair
                else if (score >= 112) foldChance = 0.15; // Strong High Card (Kicker J+)
            }

            // Influence of bet size
            const chipsRatio = toCall / (bot.chips + 1);
            if (chipsRatio > 0.8) foldChance *= 1.5; // Scared of big bets
            else if (chipsRatio < 0.1) foldChance *= 0.5; // Rarely fold on tiny bets

            if (toCall === 0) foldChance = 0; // Never fold on check

            const r = Math.random();
            let action = 'call';

            if (toCall === 0) {
                // When we can check, maybe raise instead
                action = (r < raiseChance) ? 'raise' : 'check';
            } else {
                if (r < foldChance) action = 'fold';
                else if (r > (1 - raiseChance)) action = 'raise';
                else action = 'call';
            }

            if (action === 'raise') {
                const minRaise = Math.max(10, Math.floor(minBuyIn * 0.1));
                await handleAction(bot, 'raise', null, minRaise);
            } else {
                await handleAction(bot, action);
            }
        }

        async function handleAction(player, action, interaction = null, numericValue = 0) {
            const maxBet = await getMaxBet(message.author.id);
            const exceededMaxBet = (numericValue > maxBet);
            if (exceededMaxBet && action === 'raise') return; // Double check

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

            // Grant Action XP
            if (!player.isBot) {
                await addXp(player.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);
            }

            turnIndex = (turnIndex + 1) % players.length;
            await processTurn();
        }

        function getActionRow(currentPlayer, showActions = false) {
            const rows = [];
            if (showActions && phase !== t('poker.phases.showdown', lang)) {
                const toCall = currentBet - (currentPlayer ? currentPlayer.currentBet : 0);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fold').setLabel(t('poker.action_fold', lang)).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('call').setLabel(toCall === 0 ? t('poker.action_check', lang) : t('poker.action_call', lang, { amount: toCall.toLocaleString() })).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('raise').setLabel(t('poker.action_raise', lang)).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('allin').setLabel(t('poker.action_allin', lang)).setStyle(ButtonStyle.Danger)
                );
                rows.push(row);
            }

            const viewRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('view_cards').setLabel(t('poker.btn_view_cards', lang)).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('call_to_front').setLabel('🔄').setStyle(ButtonStyle.Secondary)
            );
            rows.push(viewRow);

            return rows;
        }

        async function updateTable(forceRepost = false) {
            const activeP = players[turnIndex];
            const cardsStr = communityCards.length > 0 ? communityCards.map(c => c.toString()).join(' ') : `[ ${t('poker.waiting_label', lang)} ]`;

            const statusTxt = players.map(p => {
                let s = p.isBot ? p.name : `<@${p.id}>`;
                s += ` (💰${p.chips.toLocaleString()})`;
                if (p.folded) s += ` [${t('poker.status_folded', lang)}]`;
                else if (p.allIn) s += ` [${t('poker.status_allin', lang)}]`;
                else if (activeP && p.id === activeP.id) s += ` 👈 **${t('poker.status_turn', lang)}**`;

                if (p.currentBet > 0) s += ` [${t('poker.status_bet', lang)}: ${p.currentBet.toLocaleString()}]`;
                return s;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${t('poker.title', lang)} - ${phase}`)
                .setDescription(`**${t('poker.community_cards', lang)}:** ${cardsStr}\n\n**${t('poker.pot', lang, { amount: pot.toLocaleString(), emoji: config.EMOJIS.COIN })}\n**${t('poker.current_bet', lang, { amount: currentBet.toLocaleString(), emoji: config.EMOJIS.COIN })}\n\n${statusTxt}`)
                .setColor(config.COLORS.INFO)
                .setFooter({ text: t('poker.view_cards_hint', lang) });

            const isHumanTurn = activeP && !activeP.isBot && phase !== t('poker.phases.showdown', lang);
            const components = getActionRow(isHumanTurn ? activeP : null, isHumanTurn);

            if (forceRepost) {
                try {
                    if (reply.channel.id === (gameThread?.id || message.channel.id)) {
                        await reply.delete().catch(() => { });
                    }
                    const boardTarget = gameThread || message.channel;
                    const newBoard = await boardTarget.send({ embeds: [embed], components });
                    const oldCollector = gameCollector;
                    reply = newBoard;
                    setupGameCollector();
                    if (oldCollector) oldCollector.stop('reposted');
                } catch (err) {
                    console.error('[Poker Repost Error]:', err);
                    await reply.edit({ embeds: [embed], components }).catch(() => { });
                }
            } else {
                if (!gameCollector && phase !== t('poker.phases.showdown', lang)) {
                    setupGameCollector();
                }
                await reply.edit({ embeds: [embed], components }).catch(() => { });
            }
        }

        let gameCollector = null;
        function setupGameCollector() {
            gameCollector = reply.createMessageComponentCollector({ time: 600_000 });
            gameCollector.on('collect', pokerActionHandler);
        }

        async function pokerActionHandler(i) {
            if (!gameStarted) return;
            const p = playerMap.get(i.user.id);
            if (!p) return i.reply({ content: t('poker.not_in_game', lang), flags: 64 });

            const action = i.customId;

            if (action === 'view_cards') {
                const cards = `${p.hand[0]} ${p.hand[1]}`;
                const evalHand = evaluateHand(p.hand, communityCards, lang);
                return i.reply({
                    content: `${t('poker.view_cards_ephemeral', lang, { cards })}\n**${t('poker.current_hand_label', lang)}**: ${evalHand.name}`,
                    flags: 64
                });
            }

            if (action === 'call_to_front') {
                await i.deferUpdate().catch(() => { });
                return updateTable(true);
            }

            if (players[turnIndex].id !== p.id) {
                return i.reply({ content: t('poker.not_your_turn', lang, { name: players[turnIndex].name }), flags: 64 });
            }

            if (action === 'raise') {
                const modal = new ModalBuilder().setCustomId(`raise_modal_${i.user.id}`).setTitle(t('poker.raise_modal_title', lang));
                const minTotal = currentBet + Math.max(10, Math.floor(minBuyIn * 0.1));
                const input = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel(t('poker.raise_amount_label', lang, { min: minTotal.toLocaleString() }))
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`${minTotal.toLocaleString()}`)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await i.showModal(modal);
                try {
                    const submit = await i.awaitModalSubmit({ time: 30000, filter: s => s.customId === `raise_modal_${i.user.id}` });
                    const val = parseAmount(submit.fields.getTextInputValue('amount'), p.chips + p.currentBet);
                    if (isNaN(val) || val < minTotal) return submit.reply({ content: `❌ ${t('poker.invalid_raise', lang, { min: minTotal })}`, flags: 64 });
                    if (val > maxBet) return submit.reply({ content: t('common.max_bet_error', lang, { limit: maxBet.toLocaleString() }), flags: 64 });
                    if (val > p.chips + p.currentBet) return submit.reply({ content: t('common.insufficient_funds', lang, { balance: (p.chips + p.currentBet).toLocaleString() }), flags: 64 });
                    await submit.deferUpdate();
                    await handleAction(p, 'raise', null, val);
                } catch (e) { }
            } else if (action === 'allin') {
                await i.deferUpdate().catch(() => { });
                await handleAction(p, 'allin');
            } else {
                await i.deferUpdate().catch(() => { });
                await handleAction(p, action);
            }
        }

        async function nextPhase() {
            players.forEach(p => { p.currentBet = 0; p.hasActed = false; });
            currentBet = 0;

            if (communityCards.length === 0) {
                phase = t('poker.phases.flop', lang);
                communityCards.push(...deck.deal(3));
            } else if (communityCards.length === 3) {
                phase = t('poker.phases.turn', lang);
                communityCards.push(...deck.deal(1));
            } else if (communityCards.length === 4) {
                phase = t('poker.phases.river', lang);
                communityCards.push(...deck.deal(1));
            } else {
                await endRound();
                return;
            }

            const activePlayers = players.filter(p => !p.folded && !p.allIn);
            if (activePlayers.length === 0) {
                await updateTable(false);
                await sleep(2500);
                await nextPhase();
                return;
            }
            await startBettingRound(false);
        }

        async function endRound() {
            if (gameCollector) gameCollector.stop();
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

            const prizePerWinner = Math.floor(pot / winners.length);
            let totalBonusGiven = 0;
            let totalCap = 250;

            for (const w of winners) {
                const { total: totalPrize, bonus: bonusAmount, percent: winPercent } = await calculateReward(prizePerWinner, w.member, 'gamble', { pvpMode: true });
                w.chips += totalPrize;
                totalBonusGiven += bonusAmount;
                totalCap = winPercent;

                if (!w.isBot) {
                    const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                    await addXp(w.member, winXp, message.guild.id);
                }
            }

            for (const p of players) {
                if (p.isBot && p.chips > 0) {
                    await addHouseProfit(message, p.chips);
                } else if (!p.isBot && p.chips > 0) {
                    await db.addBalance(message.guild.id, p.id, p.chips);
                }
            }

            const winnerNames = winners.map(w => w.name).join(', ');
            let footerText = t('poker.pot', lang, { amount: (pot + totalBonusGiven).toLocaleString(), emoji: config.EMOJIS.COIN });
            if (totalBonusGiven > 0) footerText += t('common.bonus_capped', lang, { amount: totalBonusGiven.toLocaleString(), percent: totalCap });

            const cardsStr = communityCards.map(c => c.toString()).join(' ');
            const embed = new EmbedBuilder()
                .setTitle(t('poker.end_title', lang))
                .setDescription(`**${t('poker.community_cards', lang)}:** ${cardsStr}\n\n**${t('poker.winners', lang, { names: winnerNames })}\n**${footerText}\n\n${resultText}`)
                .setColor(config.COLORS.WARNING);

            // Repost the final result to move it to the bottom
            try {
                if (reply.channel.id === (gameThread?.id || message.channel.id)) {
                    await reply.delete().catch(() => { });
                }
                const boardTarget = gameThread || message.channel;
                await boardTarget.send({ embeds: [embed], components: [] });
            } catch (err) {
                await reply.edit({ embeds: [embed], components: [] }).catch(() => { });
            }

            players.forEach(p => {
                if (!p.isBot) startCooldown(message.client, 'poker', p.id);
            });
        }
    }
};
