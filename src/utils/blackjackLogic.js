const config = require('../config');

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

function handString(hand) {
    return hand.map(c => `\`${c.display}\``).join(' ');
}

function dealerWillHit(dealerHand, playerVal, playerBusted) {
    if (playerBusted) return false;
    const val = handValue(dealerHand);
    return val < 17;
}

module.exports = {
    drawCard,
    handValue,
    handString,
    dealerWillHit
};
