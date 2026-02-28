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
    const playerIsNatural = playerHand.length === 2 && playerVal === 21;
    const playerIsNguLinh = playerHand.length === 5 && playerVal <= 21;

    // Dealer draws only if player didn't bust and doesn't have a natural
    if (playerVal <= 21 && !playerIsNatural) {
        while (handValue(dealerHand) < 17) {
            if (dealerHand.length >= 5) break;
            dealerHand.push(drawCard());
        }
    }

    const dealerVal = handValue(dealerHand);
    const dealerIsNatural = dealerHand.length === 2 && dealerVal === 21;
    const dealerIsNguLinh = dealerHand.length === 5 && dealerVal <= 21;

    let result, color, payout = 0, flavorText = '', title = t('blackjack.title', lang);

    if (playerIsNatural && dealerIsNatural) {
        color = config.COLORS.GAMBLE_PUSH;
        payout = bet ? bet : 0;
        title = t('blackjack.natural_title', lang);
    } else if (playerIsNatural) {
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? Math.ceil(bet * 2.5) : 0;
        title = t('blackjack.natural_title', lang);
    } else if (dealerIsNatural) {
        color = config.COLORS.GAMBLE_LOSS;
        if (bet) addHouseProfit(i, bet);
        title = t('blackjack.natural_title', lang);
    } else if (playerIsNguLinh && dealerIsNguLinh) {
        if (playerVal < dealerVal) {
            color = config.COLORS.GAMBLE_WIN;
            payout = bet ? Math.ceil(bet * 2.5) : 0;
        } else if (playerVal > dealerVal) {
            color = config.COLORS.GAMBLE_LOSS;
            if (bet) addHouseProfit(i, bet);
        } else {
            color = config.COLORS.GAMBLE_PUSH;
            payout = bet ? bet : 0;
        }
        title = t('blackjack.ngu_linh_title', lang);
    } else if (playerIsNguLinh) {
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? Math.ceil(bet * 2.5) : 0;
        title = t('blackjack.ngu_linh_title', lang);
    } else if (dealerIsNguLinh) {
        color = config.COLORS.GAMBLE_LOSS;
        if (bet) addHouseProfit(i, bet);
        title = t('blackjack.ngu_linh_title', lang);
    } else if (dealerVal > 21) {
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? bet * 2 : 0;
    } else if (playerVal > dealerVal) {
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? bet * 2 : 0;
    } else if (playerVal < dealerVal) {
        color = config.COLORS.GAMBLE_LOSS;
        if (bet) addHouseProfit(i, bet);
    } else {
        color = config.COLORS.GAMBLE_PUSH;
        payout = bet ? bet : 0;
    }

    if (payout > 0 && bet) {
        if (payout > bet) { // If it's a win (2x or 2.5x)
            const profit = payout - bet;
            const { total: totalRes, bonus: bonusAmount, percent } = calculateReward(profit, i.member, 'gamble');
            payout = totalRes + bet; // Reward logic

            // Generate amount suffix for win
            const winAmountStr = t('blackjack.win_amount', lang, { amount: payout.toLocaleString(), emoji: config.EMOJIS.COIN });

            if (playerIsNatural) {
                result = t('blackjack.natural_win', lang) + winAmountStr;
            } else if (playerIsNguLinh) {
                result = t('blackjack.ngu_linh_win', lang, { amount: winAmountStr });
            } else if (dealerVal > 21) {
                result = t('blackjack.win', lang, { amount: winAmountStr });
            } else if (playerVal > dealerVal) {
                result = t('blackjack.win_simple', lang, { amount: winAmountStr });
            }

            if (bonusAmount > 0) {
                flavorText += `\n✨ **Bonus:** +${percent}% (${bonusAmount.toLocaleString()} ${config.EMOJIS.COIN})`;
            }
            // Musician Interaction: Flow State (15% chance to double final win)
            const u = db.getUser(i.user.id, i.guild.id);
            if (u.job === 'musician' && payout > bet && Math.random() < 0.15) {
                payout *= 2;
                flavorText += `\n` + t('common.flow_state', lang);
            }
        } else {
            // It's a tie (payout == bet)
            result = t('blackjack.tie', lang, { refund: t('blackjack.refund', lang) });

            // Chef Interaction: Complimentary Drink (Tie Tip: 50-100 coins)
            const u = db.getUser(i.user.id, i.guild.id);
            if (u.job === 'chef') {
                const tip = Math.floor(Math.random() * 51) + 50;
                payout += tip;
                result += t('job.chef_tip', lang, { amount: tip });
            }

            if (playerIsNatural && dealerIsNatural) {
                // Keep the natural tie title
            } else if (playerIsNguLinh && dealerIsNguLinh) {
                result = t('blackjack.ngu_linh_tie', lang, { refund: t('blackjack.refund', lang) });
            }
        }
    } else {
        // It's a loss
        const lossAmountStr = t('blackjack.win_amount', lang, { amount: bet.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (dealerIsNatural) {
            result = t('blackjack.lose', lang, { amount: lossAmountStr });
        } else if (dealerIsNguLinh) {
            result = t('blackjack.ngu_linh_lose', lang, { amount: lossAmountStr });
        } else if (playerVal < dealerVal || playerVal > 21) {
            result = t('blackjack.lose', lang, { amount: lossAmountStr });
        }

        // Trader Interaction: Market Tip (15% chance to refund 50% on loss)
        const u = db.getUser(i.user.id, i.guild.id);
        if (u.job === 'trader' && Math.random() < 0.15) {
            const refund = Math.floor(bet * 0.5);
            payout = refund;
            result += t('common.market_tip', lang);
        }
    }

    if (payout > 0) {
        db.addBalance(i.guild.id, i.user.id, payout);

        // Grant Win XP if payout is more than original bet (actual win)
        if (bet && payout > bet) {
            const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
            const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
            addXp(i.member, winXp, i.guild.id);
        }
    }

    const finalEmbed = buildEmbed(true);
    finalEmbed.setTitle(title).setDescription(finalEmbed.data.description + `\n\n${result}${flavorText}`).setColor(color);
    await i.update({ embeds: [finalEmbed], components: [] });
    startCooldown(i.client, 'blackjack', i.user.id);
}

module.exports = {
    name: 'blackjack',
    aliases: ['bj'],
    description: 'Chơi Xì Dách (Play Blackjack against the dealer)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id, message.guild.id);
        let bet = args[0] ? parseAmount(args[0], user.balance, config.ECONOMY.MAX_BET) : 50;

        if (args[0] && (isNaN(bet) || bet <= 0)) {
            return message.reply(`❌ ${t('common.invalid_amount', lang)}`);
        }

        if (bet && user.balance < bet) {
            return message.reply(t('common.insufficient_funds', lang, { balance: user.balance }));
        }
        const maxBet = db.getGuildSetting(message.guild.id, 'max_bet', config.ECONOMY.MAX_BET);
        const minBet = db.getGuildSetting(message.guild.id, 'min_bet', config.ECONOMY.MIN_BET);
        if (bet > maxBet) return message.reply(t('gamble.max_bet', lang, { max: maxBet.toLocaleString() }));
        if (bet < minBet) return message.reply(t('gamble.min_bet', lang, { min: minBet.toLocaleString() }));
        if (bet) db.removeBalance(message.guild.id, user.id, bet);

        // Grant Action XP at start
        const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
        addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);

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

        // --- Start of Game Checks (Natural) ---
        const playerVal = handValue(playerHand);
        const dealerVal = handValue(dealerHand);
        const playerNatural = playerHand.length === 2 && playerVal === 21;
        const dealerNatural = dealerHand.length === 2 && dealerVal === 21;

        if (playerNatural || dealerNatural) {
            return finishBlackjack({
                user: message.author,
                member: message.member,
                client: message.client,
                guild: message.guild,
                update: (data) => message.reply(data)
            }, playerHand, dealerHand, uid, buildEmbed, bet, lang);
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
                    // Grant Action XP for hitting
                    const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                    addXp(i.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, i.guild.id);
                    await i.update({ embeds: [buildEmbed()], components: [row] });
                }
            } else if (i.customId.startsWith('bj_stand')) {
                // Grant Action XP for standing
                const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
                addXp(i.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, i.guild.id);
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
