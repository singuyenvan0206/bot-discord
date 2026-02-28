const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount, addHouseProfit } = require('../../utils/economy');
const { getUserMultiplier, calculateReward } = require('../../utils/multiplier');
const { addXp, XP_AMOUNTS } = require('../../utils/leveling');

module.exports = {
    name: 'rps',
    aliases: ['rock', 'paper', 'scissors'],
    description: 'Kéo búa bao (Play Rock Paper Scissors game)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id, message.guild.id);

        const choices = ['rock', 'paper', 'scissors'];
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

        let userChoice = args[0]?.toLowerCase();

        // Support Vietnamese inputs and shorthands
        const rockAliases = ['bua', 'búa', 'r', 'b'];
        const paperAliases = ['bao', 'p'];
        const scissorsAliases = ['keo', 'kéo', 's', 'k'];

        if (rockAliases.includes(userChoice)) userChoice = 'rock';
        if (paperAliases.includes(userChoice)) userChoice = 'paper';
        if (scissorsAliases.includes(userChoice)) userChoice = 'scissors';

        let bet = 0;

        // Check if first arg is a bet amount using all known aliases
        const allValidChoices = [...choices, ...rockAliases, ...paperAliases, ...scissorsAliases];
        if (args[0] && !allValidChoices.includes(args[0]?.toLowerCase())) {
            bet = parseAmount(args[0], user.balance, config.ECONOMY.MAX_BET);
            userChoice = null; // No choice made yet
        } else if (args[1]) {
            bet = parseAmount(args[1], user.balance, config.ECONOMY.MAX_BET);
        }

        // Default Bet if none provided
        if (bet === 0 && (!args[0] || (choices.includes(userChoice) && !args[1]))) {
            bet = 50;
        }

        // Validate Bet
        if (bet > 0) {
            if (user.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: user.balance }));
            if (bet > config.ECONOMY.MAX_BET) return message.reply(t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() }));
            db.removeBalance(message.guild.id, user.id, bet);
        } else if (bet < 0) {
            return message.reply(`❌ ${t('common.invalid_amount', lang)}`);
        }

        // Grant Action XP for command mode
        if (userChoice && choices.includes(userChoice)) {
            addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);
        }

        if (!userChoice || !choices.includes(userChoice)) {
            // Interactive mode
            const uid = Date.now().toString(36);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rps_rock_${uid}`).setLabel(t('rps.rock', lang)).setEmoji('🪨').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rps_paper_${uid}`).setLabel(t('rps.paper', lang)).setEmoji('📄').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rps_scissors_${uid}`).setLabel(t('rps.scissors', lang)).setEmoji('✂️').setStyle(ButtonStyle.Primary)
            );

            const embed = new EmbedBuilder()
                .setTitle(t('rps.title', lang))
                .setDescription((bet > 0 ? t('rps.betting', lang, { amount: bet }) + '\n' : '') + t('rps.choose', lang))
                .setColor(config.COLORS.WARNING);

            const reply = await message.reply({ embeds: [embed], components: [row] });

            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30_000,
                filter: i => i.user.id === message.author.id && i.customId.endsWith(uid),
                max: 1
            });

            collector.on('collect', async i => {
                const choice = i.customId.split('_')[1];

                // Grant Action XP for interactive mode
                addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);

                await playRPS(i, choice, null, reply, bet);
                startCooldown(message.client, 'rps', message.author.id);
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    // Refund if timed out
                    if (bet > 0) db.addBalance(message.guild.id, user.id, bet);
                    reply.edit({ content: t('rps.timeout_refund', lang), embeds: [], components: [] }).catch(() => { });
                }
            });
            return;
        }

        // Command mode
        await playRPS(null, userChoice, message, null, bet);
        startCooldown(message.client, 'rps', message.author.id);

        async function playRPS(interaction, uChoice, msgObj, replyObj, betAmount) {
            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            let result = '';
            let outcome = 'lose'; // win, lose, tie

            if (uChoice === botChoice) {
                result = t('rps.tie', lang);
                outcome = 'tie';
            }
            else if (
                (uChoice === 'rock' && botChoice === 'scissors') ||
                (uChoice === 'paper' && botChoice === 'rock') ||
                (uChoice === 'scissors' && botChoice === 'paper')
            ) {
                result = t('rps.win', lang);
                outcome = 'win';
            }
            else {
                result = t('rps.lose', lang);
                outcome = 'lose';
            }

            // Payout Handling
            if (betAmount > 0) {
                if (outcome === 'win') {
                    const profit = betAmount; // Standard 2x return means 1x profit
                    const { bonus: bonusAmount, percent } = calculateReward(profit, message.member, 'gamble');
                    let prize = (betAmount * 2) + bonusAmount;

                    db.addBalance(message.guild.id, user.id, prize);
                    result += t('rps.won_coins', lang, { amount: prize.toLocaleString(), emoji: config.EMOJIS.COIN });

                    // Grant Win XP
                    const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                    addXp(message.member, winXp, message.guild.id);
                    if (bonusAmount > 0) {
                        result += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent });
                    }

                    // Musician Interaction: Flow State (20% chance to double final win)
                    if (user.job === 'musician' && Math.random() < 0.20) {
                        db.addBalance(message.guild.id, user.id, prize); // Add another prize
                        result += t('common.flow_state', lang);
                    }
                } else if (outcome === 'tie') {
                    db.addBalance(message.guild.id, user.id, betAmount); // Refund
                    result += t('rps.refund', lang);
                } else {
                    result += t('rps.lost_coins', lang, { amount: betAmount });
                    addHouseProfit(interaction || msgObj, betAmount);

                    // Trader Interaction: Market Tip (35% chance to refund 50% on loss)
                    if (user.job === 'trader' && Math.random() < 0.35) {
                        const refund = Math.floor(betAmount * 0.5);
                        db.addBalance(message.guild.id, user.id, refund);
                        result += t('common.market_tip', lang);
                    }
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(t('rps.result_title', lang))
                .setDescription(`${t('rps.user_chose', lang)}: ${emojis[uChoice]} **${t(`rps.${uChoice}`, lang)}**\n${t('rps.bot_chose', lang)}: ${emojis[botChoice]} **${t(`rps.${botChoice}`, lang)}**\n\n**${result}**`)
                .setColor(outcome === 'win' ? config.COLORS.GAMBLE_WIN : outcome === 'tie' ? config.COLORS.GAMBLE_PUSH : config.COLORS.GAMBLE_LOSS);

            if (interaction) {
                await interaction.update({ embeds: [embed], components: [] });
            } else {
                await msgObj.reply({ embeds: [embed] });
            }
        }
    }
};
