const { t } = require('./i18n');

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♠️', '♥️', '♦️', '♣️'];

class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = RANKS.indexOf(rank) + 2;
    }

    toString() {
        return `${this.rank}${this.suit}`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        for (const s of SUITS) {
            for (const r of RANKS) {
                this.cards.push(new Card(s, r));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(count = 1) {
        return this.cards.splice(0, count);
    }
}

function evaluateHand(holeCards, communityCards, lang = 'vi') {
    const allCards = [...holeCards, ...communityCards];
    // Sort by value descending
    allCards.sort((a, b) => b.value - a.value);

    const isFlush = getFlush(allCards);
    const isStraight = getStraight(allCards);

    const rankCounts = {};
    for (const c of allCards) {
        rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    }

    const countValues = Object.values(rankCounts);
    const maxCount = Math.max(...countValues);

    // Check for Straight Flush
    if (isFlush && isStraight) {
        const flushSuit = getFlushSuit(allCards);
        if (flushSuit) {
            const flushCards = allCards.filter(c => c.suit === flushSuit);
            if (getStraight(flushCards)) return { score: 900, name: t('poker.hand_names.straight_flush', lang), cards: flushCards.slice(0, 5) };
        }
    }

    // 4 of a Kind
    if (maxCount === 4) {
        const quadValue = Object.keys(rankCounts).find(key => rankCounts[key] === 4);
        return { score: 800 + parseInt(quadValue), name: t('poker.hand_names.four_of_a_kind', lang) };
    }

    // Full House (3 + 2)
    if (maxCount === 3 && countValues.filter(c => c >= 2).length >= 2) {
        const tripValue = Math.max(...Object.keys(rankCounts).filter(k => rankCounts[k] === 3).map(Number));
        return { score: 700 + tripValue, name: t('poker.hand_names.full_house', lang) };
    }

    // Flush
    if (isFlush) {
        return { score: 600 + isFlush[0].value, name: t('poker.hand_names.flush', lang) };
    }

    // Straight
    if (isStraight) {
        return { score: 500 + isStraight[0].value, name: t('poker.hand_names.straight', lang) };
    }

    // 3 of a Kind
    if (maxCount === 3) {
        const tripValue = Math.max(...Object.keys(rankCounts).filter(k => rankCounts[k] === 3).map(Number));
        return { score: 400 + tripValue, name: t('poker.hand_names.three_of_a_kind', lang) };
    }

    // Two Pair
    if (countValues.filter(c => c === 2).length >= 2) {
        const pairs = Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number).sort((a, b) => b - a);
        return { score: 300 + pairs[0], name: t('poker.hand_names.two_pair', lang) };
    }

    // Pair
    if (maxCount === 2) {
        const pairValue = Math.max(...Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number));
        return { score: 200 + pairValue, name: t('poker.hand_names.pair', lang) };
    }

    // High Card
    return { score: 100 + allCards[0].value, name: t('poker.hand_names.high_card', lang) };
}

function getFlushSuit(cards) {
    const counts = {};
    for (const c of cards) counts[c.suit] = (counts[c.suit] || 0) + 1;
    return Object.keys(counts).find(s => counts[s] >= 5);
}

function getFlush(cards) {
    const suit = getFlushSuit(cards);
    if (!suit) return null;
    return cards.filter(c => c.suit === suit).slice(0, 5);
}

function getStraight(cards) {
    const uniqueValues = [...new Set(cards.map(c => c.value))].sort((a, b) => b - a);
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        const subset = uniqueValues.slice(i, i + 5);
        if (subset[0] - subset[4] === 4) {
            return cards.filter(c => c.value === subset[0]);
        }
    }
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return cards.filter(c => c.value === 5); // 5-high straight
    }
    return null;
}

module.exports = { Deck, evaluateHand };

function getFlushSuit(cards) {
    const counts = {};
    for (const c of cards) counts[c.suit] = (counts[c.suit] || 0) + 1;
    return Object.keys(counts).find(s => counts[s] >= 5);
}

function getFlush(cards) {
    const suit = getFlushSuit(cards);
    if (!suit) return null;
    return cards.filter(c => c.suit === suit).slice(0, 5);
}

function getStraight(cards) {
    // Dedup by value for straight check
    const uniqueValues = [...new Set(cards.map(c => c.value))].sort((a, b) => b - a);

    // Check for 5 consecutive
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        const subset = uniqueValues.slice(i, i + 5);
        if (subset[0] - subset[4] === 4) {
            // Found it! Map back to cards (just return the first one as high card representation)
            return cards.filter(c => c.value === subset[0]);
        }
    }

    // Wheel (A-2-3-4-5)
    // A=14. If we have 14, 5, 4, 3, 2
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return cards.filter(c => c.value === 5); // 5-high straight
    }

    return null;
}

module.exports = { Deck, evaluateHand };
