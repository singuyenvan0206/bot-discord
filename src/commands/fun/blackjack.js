const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount, addHouseProfit } = require('../../utils/economy');
const { getUserMultiplier, calculateReward } = require('../../utils/multiplier');

const CARD_SUITS = config.CARDS.SUITS;
const CARD_VALUES = config.CARDS.VALUES;

function drawCard() {
    const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
    const value = CARD_VALUES[Math.floor(Math.random() * CARD_VALUES.length)];
    return { suit, value, display: `${value}${suit}` };
}

function handValue(hand) {
    let total = 0, aces = 0;
    for (const card of hand) {
        if (card.value === 'A') { total += 11; aces++; }
        else if (['K', 'Q', 'J'].includes(card.value)) total += 10;
        else total += parseInt(card.value);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function handString(hand) { return hand.map(c => `\`${c.display}\``).join(' '); }

async function finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed, bet, lang) {
    const playerVal = handValue(playerHand);
    const playerIsNguLinh = playerHand.length === 5 && playerVal <= 21;

    // Dealer draws only if player didn't bust and hasn't already won with a 5-card charlie (unless dealer could also get one)
    // Actually, in many variants, if player gets 5 cards, dealer still tries to get 5 cards to compare.
    while (handValue(dealerHand) < 17 || (dealerHand.length < 5 && handValue(dealerHand) <= 21)) {
        if (dealerHand.length >= 5) break;
        dealerHand.push(drawCard());
    }

    const dealerVal = handValue(dealerHand);
    const dealerIsNguLinh = dealerHand.length === 5 && dealerVal <= 21;

    let result, color, payout = 0;
    const amountStr = bet ? t('blackjack.win_amount', lang, { amount: bet.toLocaleString() }) : '';

    if (playerIsNguLinh && dealerIsNguLinh) {
        if (playerVal < dealerVal) {
            result = t('blackjack.ngu_linh_win', lang, { amount: amountStr });
            color = config.COLORS.GAMBLE_WIN;
            payout = bet ? Math.ceil(bet * 2.5) : 0;
        } else if (playerVal > dealerVal) {
            result = t('blackjack.ngu_linh_lose', lang, { amount: amountStr });
            color = config.COLORS.GAMBLE_LOSS;
            if (bet) addHouseProfit(i, bet);
        } else {
            result = t('blackjack.ngu_linh_tie', lang, { refund: bet ? t('blackjack.refund', lang) : '' });
            color = config.COLORS.GAMBLE_PUSH;
            payout = bet ? bet : 0;
        }
    } else if (playerIsNguLinh) {
        result = t('blackjack.ngu_linh_win', lang, { amount: amountStr });
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? Math.ceil(bet * 2.5) : 0;
    } else if (dealerIsNguLinh) {
        result = t('blackjack.ngu_linh_lose', lang, { amount: amountStr });
        color = config.COLORS.GAMBLE_LOSS;
        if (bet) addHouseProfit(i, bet);
    } else if (dealerVal > 21) {
        result = t('blackjack.win', lang, { amount: amountStr });
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? bet * 2 : 0;
    } else if (playerVal > dealerVal) {
        result = t('blackjack.win_simple', lang, { amount: amountStr });
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? bet * 2 : 0;
    } else if (playerVal < dealerVal) {
        result = t('blackjack.lose', lang, { amount: amountStr });
        color = config.COLORS.GAMBLE_LOSS;
        if (bet) addHouseProfit(i, bet);
    } else {
        result = t('blackjack.tie', lang, { refund: bet ? t('blackjack.refund', lang) : '' });
        color = config.COLORS.GAMBLE_PUSH;
        payout = bet ? bet : 0;
    }

    if (payout > 0 && bet) {
        if (payout > bet) { // If it's a win (2x)
            const { total: totalReward, bonus: bonusAmount } = calculateReward(payout, i.user.id, 'gamble');
            payout = totalReward;
            if (bonusAmount > 0) result += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString() });
        }
    }

    if (payout > 0) db.addBalance(i.user.id, payout);

    const finalEmbed = buildEmbed(true);
    finalEmbed.setDescription(finalEmbed.data.description + `\n\n${result}`).setColor(color);
    await i.update({ embeds: [finalEmbed], components: [] });
    startCooldown(i.client, 'blackjack', i.user.id);
}

module.exports = {
    name: 'blackjack',
    aliases: ['bj'],
    description: 'Chơi Xì Dách (Blackjack) đối kháng với nhà cái!',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        let bet = args[0] ? parseAmount(args[0], user.balance, config.ECONOMY.MAX_BET) : 50;

        if (args[0] && (isNaN(bet) || bet <= 0)) {
            return message.reply(`❌ ${t('common.invalid_amount', lang)}`);
        }

        if (bet && user.balance < bet) {
            return message.reply(t('common.insufficient_funds', lang, { balance: user.balance }));
        }
        if (bet > config.ECONOMY.MAX_BET) return message.reply(t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() }));
        if (bet) db.removeBalance(user.id, bet);

        const playerHand = [drawCard(), drawCard()];
        const dealerHand = [drawCard(), drawCard()];
        const uid = Date.now().toString(36);

        function buildEmbed(showDealer = false) {
            const playerVal = handValue(playerHand);
            const dealerVal = showDealer ? handValue(dealerHand) : '?';
            const dealerCards = showDealer ? handString(dealerHand) : `${dealerHand[0].display} \`??\``;

            return new EmbedBuilder()
                .setTitle(t('blackjack.title', lang))
                .setDescription([
                    `**${t('blackjack.dealer_hand', lang)}** (${dealerVal})`, dealerCards, '',
                    `**${t('blackjack.player_hand', lang)}** (${playerVal})`, handString(playerHand),
                ].join('\n'))
                .setColor(playerVal > 21 ? config.COLORS.GAMBLE_LOSS : config.COLORS.GAMBLE_WIN).setTimestamp();
        }

        if (handValue(playerHand) === 21) {
            if (bet) {
                const baseProfit = Math.ceil(bet * 1.5);
                const winBase = bet + baseProfit;
                const { total: totalPayout, bonus: bonusAmount } = calculateReward(winBase, message.author.id, 'gamble');

                db.addBalance(message.author.id, totalPayout);

                let naturalWinDesc = buildEmbed(true).data.description + `\n\n${t('blackjack.natural_win', lang)}\n**${t('blackjack.base_win', lang)}:** ${config.EMOJIS.COIN} +${baseProfit}\n**${t('blackjack.total_payout', lang)}:** ${config.EMOJIS.COIN} **${totalPayout.toLocaleString()}** coins`;
                if (bonusAmount > 0) {
                    naturalWinDesc += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString() });
                }

                const embed = buildEmbed(true)
                    .setTitle(t('blackjack.natural_title', lang))
                    .setDescription(naturalWinDesc);

                startCooldown(message.client, 'blackjack', message.author.id);
                return message.reply({ embeds: [embed] });
            } else {
                const embed = buildEmbed(true).setTitle(t('blackjack.natural_title', lang)).setDescription(buildEmbed(true).data.description + `\n\n${t('blackjack.natural_win', lang)}`);
                return message.reply({ embeds: [embed] });
            }
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel(t('blackjack.label_hit', lang)).setEmoji(config.EMOJIS.BLACKJACK).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel(t('blackjack.label_stand', lang)).setEmoji(config.EMOJIS.STOP).setStyle(ButtonStyle.Danger),
        );

        const reply = await message.reply({ embeds: [buildEmbed()], components: [row] });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) => i.user.id === message.author.id && i.customId.endsWith(uid),
            time: 60_000
        });

        collector.on('collect', async (i) => {
            if (i.customId.startsWith('bj_hit')) {
                playerHand.push(drawCard());
                if (handValue(playerHand) > 21) {
                    const bustEmbed = buildEmbed(true).setTitle(t('blackjack.bust_title', lang)).setColor(config.COLORS.GAMBLE_LOSS);
                    let bustDesc = bustEmbed.data.description + `\n\n${t('blackjack.bust_msg', lang)}`;
                    if (bet) {
                        addHouseProfit(i, bet);
                        bustDesc += `\n${t('blackjack.won_coins', lang, { amount: bet.toLocaleString(), emoji: config.EMOJIS.COIN })}`;
                    }
                    bustEmbed.setDescription(bustDesc);
                    await i.update({ embeds: [bustEmbed], components: [] });
                    startCooldown(i.client, 'blackjack', message.author.id);
                    collector.stop();
                }
                else if (handValue(playerHand) === 21 || playerHand.length === 5) {
                    collector.stop('stand');
                    await finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed, bet, lang);
                } else {
                    await i.update({ embeds: [buildEmbed()], components: [row] });
                }
            } else if (i.customId.startsWith('bj_stand')) {
                collector.stop('stand');
                await finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed, bet, lang);
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                reply.edit({ embeds: [buildEmbed(true).setTitle(t('blackjack.timeout_title', lang, { emoji: config.EMOJIS.TIMER }))], components: [] }).catch(() => { });
            }
        });
    }
};
