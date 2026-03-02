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
    if (isFlush) {
        const flushSuit = getFlushSuit(allCards);
        const flushCards = allCards.filter(c => c.suit === flushSuit);
        const straightFlush = getStraight(flushCards);
        if (straightFlush) {
            return { score: 900 + straightFlush[0].value, name: t('poker.hand_names.straight_flush', lang), cards: straightFlush.slice(0, 5) };
        }
    }

    // 4 of a Kind
    if (maxCount === 4) {
        const quadValue = Object.keys(rankCounts).find(key => rankCounts[key] === 4);
        return { score: 800 + parseInt(quadValue), name: t('poker.hand_names.four_of_a_kind', lang) };
    }

    // Full House (3 + 2)
    const tripValues = Object.keys(rankCounts).filter(k => rankCounts[k] === 3).map(Number).sort((a, b) => b - a);
    const pairValues = Object.keys(rankCounts).filter(k => rankCounts[k] >= 2).map(Number).sort((a, b) => b - a);

    if (tripValues.length >= 1 && pairValues.length >= 2) {
        const trips = tripValues[0];
        const pair = pairValues.find(v => v !== trips);
        return { score: 700 + trips + (pair / 100), name: t('poker.hand_names.full_house', lang) };
    }

    // Flush
    if (isFlush) {
        // Use top 5 flush cards for score
        return {
            score: 600 + isFlush[0].value + (isFlush[1].value / 100) + (isFlush[2].value / 10000) + (isFlush[3].value / 1000000) + (isFlush[4].value / 100000000),
            name: t('poker.hand_names.flush', lang)
        };
    }

    // Straight
    if (isStraight) {
        return { score: 500 + isStraight[0].value, name: t('poker.hand_names.straight', lang) };
    }

    // 3 of a Kind
    if (maxCount === 3) {
        const tripValue = Math.max(...Object.keys(rankCounts).filter(k => rankCounts[k] === 3).map(Number));
        const kickers = allCards.filter(c => c.value !== tripValue).sort((a, b) => b.value - a.value);
        const k1 = kickers.length > 0 ? kickers[0].value : 0;
        const k2 = kickers.length > 1 ? kickers[1].value : 0;
        return { score: 400 + tripValue + (k1 / 100) + (k2 / 10000), name: t('poker.hand_names.three_of_a_kind', lang) };
    }

    // Two Pair
    if (countValues.filter(c => c === 2).length >= 2) {
        const pairs = Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number).sort((a, b) => b - a);
        const remaining = allCards.filter(c => c.value !== pairs[0] && c.value !== pairs[1]).sort((a, b) => b.value - a.value);
        const kicker = remaining.length > 0 ? remaining[0].value : 0;
        return { score: 300 + pairs[0] + (pairs[1] / 100) + (kicker / 10000), name: t('poker.hand_names.two_pair', lang) };
    }

    // Pair
    if (maxCount === 2) {
        const pairValue = Math.max(...Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number));
        const remaining = allCards.filter(c => c.value !== pairValue).sort((a, b) => b.value - a.value);
        const kicker1 = remaining.length > 0 ? remaining[0].value : 0;
        const kicker2 = remaining.length > 1 ? remaining[1].value : 0;
        const kicker3 = remaining.length > 2 ? remaining[2].value : 0;
        return { score: 200 + pairValue + (kicker1 / 100) + (kicker2 / 10000) + (kicker3 / 1000000), name: t('poker.hand_names.pair', lang) };
    }

    // High Card
    // Use up to 5 cards for accurate tie-break
    const k1 = allCards[0].value;
    const k2 = allCards.length > 1 ? allCards[1].value : 0;
    const k3 = allCards.length > 2 ? allCards[2].value : 0;
    const k4 = allCards.length > 3 ? allCards[3].value : 0;
    const k5 = allCards.length > 4 ? allCards[4].value : 0;
    return {
        score: 100 + k1 + (k2 / 100) + (k3 / 10000) + (k4 / 1000000) + (k5 / 100000000),
        name: t('poker.hand_names.high_card', lang)
    };
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
            const straightCards = [];
            for (const val of subset) {
                straightCards.push(cards.find(c => c.value === val));
            }
            return straightCards;
        }
    }
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        const values = [5, 4, 3, 2, 14];
        const straightCards = [];
        for (const val of values) {
            straightCards.push(cards.find(c => c.value === val));
        }
        return straightCards; // A-high (actually 5-high) straight
    }
    return null;
}

module.exports = { Deck, evaluateHand };
