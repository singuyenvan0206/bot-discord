const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');
const { getUserMultiplier } = require('../../utils/multiplier');

module.exports = {
    name: 'rps',
    aliases: ['rock', 'paper', 'scissors'],
    description: 'Trò chơi Kéo Búa Bao',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);

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
            bet = parseAmount(args[0], user.balance);
            userChoice = null; // No choice made yet
        } else if (args[1]) {
            bet = parseAmount(args[1], user.balance);
        }

        // Default Bet if none provided
        if (bet === 0 && (!args[0] || (choices.includes(userChoice) && !args[1]))) {
            bet = 50;
        }

        // Validate Bet
        if (bet > 0) {
            if (user.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: user.balance }));
            if (bet > config.ECONOMY.MAX_BET) return message.reply(t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() }));
            db.removeBalance(user.id, bet);
        } else if (bet < 0) {
            return message.reply(`❌ ${t('common.invalid_amount', lang)}`);
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
                await playRPS(i, choice, null, reply, bet);
                startCooldown(message.client, 'rps', message.author.id);
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    // Refund if timed out
                    if (bet > 0) db.addBalance(user.id, bet);
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
                    let prize = betAmount * 2;
                    const multiplier = getUserMultiplier(user.id, 'gamble');
                    const bonus = Math.floor(prize * multiplier);
                    prize += bonus;

                    db.addBalance(user.id, prize);
                    result += t('rps.won_coins', lang, { amount: prize, emoji: config.EMOJIS.COIN });
                    if (bonus > 0) result += t('slots.bonus_item', lang, { amount: bonus, percent: Math.round(multiplier * 100) });
                } else if (outcome === 'tie') {
                    db.addBalance(user.id, betAmount); // Refund
                    result += t('rps.refund', lang);
                } else {
                    result += t('rps.lost_coins', lang, { amount: betAmount });
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
