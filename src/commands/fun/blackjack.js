const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');

const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️'];
const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function drawCard() {
    const suit = CARD_SUITS[Math.floor(Math.random() * 4)];
    const value = CARD_VALUES[Math.floor(Math.random() * 13)];
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
        color = 0x2ECC71;
        payout = bet ? bet * 2 : 0;

        if (payout > 0) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const bonusMult = getUserMultiplier(i.user.id, 'gamble');
            const bonus = Math.floor(payout * bonusMult);
            payout += bonus;
            if (bonus > 0) result += ` *(+${Math.round(bonusMult * 100)}% bonus)*`;
        }
    }
    else if (playerVal > dealerVal) {
        result = `🎉 **You win${bet ? ` ${bet} coins` : ''}!**`;
        color = 0x2ECC71;
        payout = bet ? bet * 2 : 0;

        if (payout > 0) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const bonusMult = getUserMultiplier(i.user.id, 'gamble');
            const bonus = Math.floor(payout * bonusMult);
            payout += bonus;
            if (bonus > 0) result += ` *(+${Math.round(bonusMult * 100)}% bonus)*`;
        }
    }
    else if (playerVal < dealerVal) {
        result = `😔 **Dealer wins${bet ? ` ${bet} coins` : ''}!**`;
        color = 0xE74C3C;
    }
    else {
        result = `🤝 **It's a push (tie)!**${bet ? ' Bet refunded.' : ''}`;
        color = 0xF39C12;
        payout = bet ? bet : 0;
    }

    if (payout > 0) db.addBalance(i.user.id, payout);

    const finalEmbed = buildEmbed(true);
    finalEmbed.setDescription(finalEmbed.data.description + `\n\n${result}`).setColor(color);
    await i.update({ embeds: [finalEmbed], components: [] });
}

module.exports = {
    name: 'blackjack',
    aliases: ['bj'],
    description: 'Play Blackjack against the dealer!',
    cooldown: 10,
    async execute(message, args) {
        let bet = parseInt(args[0]);
        if (!args[0]) bet = 50; // Default

        const user = db.getUser(message.author.id);

        if (args[0] && (isNaN(bet) || bet <= 0)) {
            return message.reply('❌ Invalid bet amount.');
        }

        if (bet && user.balance < bet) {
            return message.reply(`❌ You don't have enough money! Balance: **${user.balance}**`);
        }
        if (bet) db.removeBalance(user.id, bet);

        const playerHand = [drawCard(), drawCard()];
        const dealerHand = [drawCard(), drawCard()];
        const uid = Date.now().toString(36);

        function buildEmbed(showDealer = false) {
            const playerVal = handValue(playerHand);
            const dealerVal = showDealer ? handValue(dealerHand) : '?';
            const dealerCards = showDealer ? handString(dealerHand) : `${dealerHand[0].display} \`??\``;

            return new EmbedBuilder()
                .setTitle('🃏  Blackjack')
                .setDescription([
                    `**Dealer's Hand** (${dealerVal})`, dealerCards, '',
                    `**Your Hand** (${playerVal})`, handString(playerHand),
                ].join('\n'))
                .setColor(playerVal > 21 ? 0xE74C3C : 0x2ECC71).setTimestamp();
        }

        if (handValue(playerHand) === 21) {
            const winAmount = Math.ceil(bet * 1.5);
            if (bet) {
                const { getUserMultiplier } = require('../../utils/multiplier');
                const bonusMult = getUserMultiplier(message.author.id, 'gamble');
                const bonus = Math.floor(winAmount * bonusMult);
                winAmount += bonus;
                db.addBalance(message.author.id, winAmount);
            }
            const embed = buildEmbed(true).setTitle('🃏  Blackjack — 🎉 BLACKJACK!').setDescription(buildEmbed(true).data.description + `\n\n🏆 **Natural Blackjack! You win${bet ? ` ${winAmount + bet} coins` : ''}!**`);
            return message.reply({ embeds: [embed] });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('Stand').setEmoji('🛑').setStyle(ButtonStyle.Danger),
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
                    const bustEmbed = buildEmbed(true).setTitle('🃏  Blackjack — 💥 BUST!').setColor(0xE74C3C);
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
                reply.edit({ embeds: [buildEmbed(true).setTitle('🃏  Blackjack — ⏰ Timed Out')], components: [] }).catch(() => { });
            }
        });
    }
};
