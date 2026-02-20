const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

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

async function finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed, bet) {
    while (handValue(dealerHand) < 17) dealerHand.push(drawCard());

    const playerVal = handValue(playerHand);
    const dealerVal = handValue(dealerHand);

    let result, color, payout = 0;
    if (dealerVal > 21) {
        result = `🎉 **Dealer busts! You win${bet ? ` ${bet} coins` : ''}!**`;
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? bet * 2 : 0;

        if (payout > 0) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(i.user.id, 'gamble');
            const bonus = Math.floor(bet * multiplier);
            payout += bonus;
            if (bonus > 0) result += ` *(+${Math.round(multiplier * 100)}% bonus: ${bonus} coins)*`;
        }
    }
    else if (playerVal > dealerVal) {
        result = `🎉 **You win${bet ? ` ${bet} coins` : ''}!**`;
        color = config.COLORS.GAMBLE_WIN;
        payout = bet ? bet * 2 : 0;

        if (payout > 0) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(i.user.id, 'gamble');
            const bonus = Math.floor(bet * multiplier);
            payout += bonus;
            if (bonus > 0) result += ` *(+${Math.round(multiplier * 100)}% bonus: ${bonus} coins)*`;
        }
    }
    else if (playerVal < dealerVal) {
        result = `😔 **Dealer wins${bet ? ` ${bet} coins` : ''}!**`;
        color = config.COLORS.GAMBLE_LOSS;
    }
    else {
        result = `🤝 **It's a push (tie)!**${bet ? ' Bet refunded.' : ''}`;
        color = config.COLORS.GAMBLE_PUSH;
        payout = bet ? bet : 0;
    }

    if (payout > 0) db.addBalance(i.user.id, payout);

    const finalEmbed = buildEmbed(true);
    finalEmbed.setDescription(finalEmbed.data.description + `\n\n${result}`).setColor(color);
    await i.update({ embeds: [finalEmbed], components: [] });
    startCooldown(i.client, 'blackjack', i.user.id);
}

const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'blackjack',
    aliases: ['bj'],
    description: 'Play Blackjack against the dealer!',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const user = db.getUser(message.author.id);
        let bet = args[0] ? parseAmount(args[0], user.balance) : 50;

        if (args[0] && (isNaN(bet) || bet <= 0)) {
            return message.reply(`${config.EMOJIS.ERROR} Invalid bet amount.`);
        }

        if (bet && user.balance < bet) {
            return message.reply(`${config.EMOJIS.ERROR} You don't have enough money! Balance: **${user.balance}**`);
        }
        if (bet > config.ECONOMY.MAX_BET) return message.reply(`${config.EMOJIS.ERROR} The maximum bet is **${config.ECONOMY.MAX_BET.toLocaleString()}** coins!`);
        if (bet) db.removeBalance(user.id, bet);

        const playerHand = [drawCard(), drawCard()];
        const dealerHand = [drawCard(), drawCard()];
        const uid = Date.now().toString(36);

        function buildEmbed(showDealer = false) {
            const playerVal = handValue(playerHand);
            const dealerVal = showDealer ? handValue(dealerHand) : '?';
            const dealerCards = showDealer ? handString(dealerHand) : `${dealerHand[0].display} \`??\``;

            return new EmbedBuilder()
                .setTitle(`${config.EMOJIS.BLACKJACK}  Blackjack`)
                .setDescription([
                    `**Dealer's Hand** (${dealerVal})`, dealerCards, '',
                    `**Your Hand** (${playerVal})`, handString(playerHand),
                ].join('\n'))
                .setColor(playerVal > 21 ? config.COLORS.GAMBLE_LOSS : config.COLORS.GAMBLE_WIN).setTimestamp();
        }

        if (handValue(playerHand) === 21) {
            if (bet) {
                const baseProfit = Math.ceil(bet * 1.5);
                const { getUserMultiplier } = require('../../utils/multiplier');
                const multiplier = getUserMultiplier(message.author.id, 'gamble');
                const bonus = Math.floor(bet * multiplier);
                const totalPayout = bet + baseProfit + bonus; // Refund bet + 1.5x profit + bonus

                db.addBalance(message.author.id, totalPayout);

                const embed = buildEmbed(true)
                    .setTitle(`${config.EMOJIS.BLACKJACK}  Blackjack — 🎉 BLACKJACK!`)
                    .setDescription(buildEmbed(true).data.description + `\n\n🏆 **Natural Blackjack!**\n**Base Win:** ${config.EMOJIS.COIN} +${baseProfit}\n**Item Bonus:** ✨ +${bonus} (${Math.round(multiplier * 100)}%)\n**Total Returned:** ${config.EMOJIS.COIN} **${totalPayout}** coins`);

                startCooldown(message.client, 'blackjack', message.author.id);
                return message.reply({ embeds: [embed] });
            } else {
                const embed = buildEmbed(true).setTitle(`${config.EMOJIS.BLACKJACK}  Blackjack — 🎉 BLACKJACK!`).setDescription(buildEmbed(true).data.description + `\n\n🏆 **Natural Blackjack!**`);
                return message.reply({ embeds: [embed] });
            }
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('Hit').setEmoji(config.EMOJIS.BLACKJACK).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('Stand').setEmoji(config.EMOJIS.STOP).setStyle(ButtonStyle.Danger),
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
                    const bustEmbed = buildEmbed(true).setTitle(`${config.EMOJIS.BLACKJACK}  Blackjack — 💥 BUST!`).setColor(config.COLORS.GAMBLE_LOSS);
                    bustEmbed.setDescription(bustEmbed.data.description + '\n\n💥 **Bust! You went over 21. Dealer wins!**');
                    await i.update({ embeds: [bustEmbed], components: [] });
                    collector.stop();
                } else if (handValue(playerHand) === 21) {
                    collector.stop('stand');
                    await finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed, bet);
                } else {
                    await i.update({ embeds: [buildEmbed()], components: [row] });
                }
            } else if (i.customId.startsWith('bj_stand')) {
                collector.stop('stand');
                await finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed, bet);
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                reply.edit({ embeds: [buildEmbed(true).setTitle(`${config.EMOJIS.BLACKJACK}  Blackjack — ${config.EMOJIS.TIMER} Timed Out`)], components: [] }).catch(() => { });
            }
        });
    }
};
