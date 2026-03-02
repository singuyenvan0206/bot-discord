module.exports = [
    // ==========================================
    // GROUP 100 — daily (buff $daily reward)
    // ==========================================
    { id: 101, name: 'Cookie', price: 100, multiplier: 0.10, duration: 86400, type: 'daily' },
    { id: 102, name: 'Shag Rug', price: 12000, multiplier: 0.40, duration: 604800, type: 'daily' },
    { id: 103, name: 'Moai Statue', price: 120000, multiplier: 0.80, duration: 2592000, type: 'daily' },
    { id: 104, name: 'VIP Golden Ticket', price: 500000, multiplier: 1.50, duration: 2592000, type: 'daily' },
    { id: 105, name: 'Space Station', price: 2000000, multiplier: 3.50, duration: 2592000, type: 'daily' },

    // ==========================================
    // GROUP 200 — income (buff $work, $fish, $search)
    // ==========================================
    { id: 201, name: 'Smartphone', price: 2000, multiplier: 0.15, duration: 604800, type: 'income' },
    { id: 202, name: 'RGB Keyboard', price: 15000, multiplier: 0.40, duration: 604800, type: 'income' },
    { id: 203, name: '4K Monitor', price: 40000, multiplier: 0.70, duration: 604800, type: 'income' },
    { id: 204, name: 'Trading Terminal', price: 200000, multiplier: 1.20, duration: 2592000, type: 'income' },
    { id: 205, name: 'Superyacht', price: 2000000, multiplier: 4.00, duration: 2592000, type: 'income' },

    // ==========================================
    // GROUP 300 — gamble (buff $coinflip, $slots, $dice, $blackjack)
    // ==========================================
    { id: 301, name: 'Golden Dice', price: 8000, multiplier: 0.25, duration: 604800, type: 'gamble' },
    { id: 302, name: 'Emerald Necklace', price: 100000, multiplier: 0.60, duration: 2592000, type: 'gamble' },
    { id: 303, name: 'Clay Chips', price: 200000, multiplier: 1.00, duration: 2592000, type: 'gamble' },
    { id: 304, name: '4-Leaf Clover', price: 500000, multiplier: 1.80, duration: 2592000, type: 'gamble' },
    { id: 305, name: 'Time Machine', price: 2000000, multiplier: 5.00, duration: 2592000, type: 'gamble' },

    // ==========================================
    // GROUP 400 — bait (fishing baits)
    // ==========================================
    { id: 401, name: 'Bread Bait', price: 50, multiplier: 0.05, type: 'bait' },
    { id: 402, name: 'Worm Bait', price: 150, multiplier: 0.15, type: 'bait' },
    { id: 403, name: 'Shrimp Bait', price: 800, multiplier: 0.40, type: 'bait' },
    { id: 404, name: 'Cricket Bait', price: 2500, multiplier: 0.75, type: 'bait' },
    { id: 405, name: 'Squid Bait', price: 10000, multiplier: 1.50, type: 'bait' },
    { id: 406, name: 'Golden Bait', price: 15000, multiplier: 3.00, type: 'bait' },

    // ==========================================
    // GROUP 450 — tool (fishing rods, no duration)
    // ==========================================
    { id: 407, name: 'Plastic Rod', price: 25000, multiplier: 0.5, type: 'tool' },
    { id: 408, name: 'Bamboo Rod', price: 50000, multiplier: 1.0, type: 'tool' },
    { id: 409, name: 'Fiberglass Rod', price: 100000, multiplier: 1.8, type: 'tool' },
    { id: 410, name: 'Steel Rod', price: 120000, multiplier: 2.5, type: 'tool' },
    { id: 411, name: 'Carbon Rod', price: 350000, multiplier: 3.5, type: 'tool' },
    { id: 412, name: 'Titanium Rod', price: 800000, multiplier: 5.0, type: 'tool' },
    { id: 413, name: "Neptune's Rod", price: 2000000, multiplier: 7.5, type: 'tool' },

    // ==========================================
    // GROUP 500 — other (special utility items)
    // ==========================================
    { id: 501, name: 'Shield of Protection', price: 5000, multiplier: 0, duration: 86400, type: 'robshield' },
    { id: 502, name: 'XP Boost Potion', price: 100000, multiplier: 0, duration: 86400, type: 'xpboost' },
    { id: 503, name: 'Career Change Voucher', price: 2000000, multiplier: 0, type: 'other' },

    // ==========================================
    // GROUP 600 — event (buffs given by events/catches)
    // ==========================================
    { id: 601, name: "Megalodon's Blessing", price: 0, multiplier: 0.50, duration: 3600, type: 'income', unbuyable: true },
    { id: 602, name: "Poseidon's Favor", price: 0, multiplier: 1.00, duration: 7200, type: 'income', unbuyable: true },
    { id: 603, name: "Pearl's Radiance", price: 0, multiplier: 0.40, duration: 3600, type: 'income', unbuyable: true },
    { id: 604, name: "Kraken's Might", price: 0, multiplier: 0.60, duration: 5400, type: 'income', unbuyable: true },
    { id: 605, name: "Turtle's Longevity", price: 0, multiplier: 0.70, duration: 10800, type: 'income', unbuyable: true },
    { id: 606, name: "Dragon's Majesty", price: 0, multiplier: 1.50, duration: 7200, type: 'income', unbuyable: true },

    // ==========================================
    // GROUP 700 — social (marriage items)
    // ==========================================
    { id: 701, name: 'Wedding Ring', price: 50000, multiplier: 0.25, type: 'social', unusable: true },
    { id: 702, name: 'Diamond Ring', price: 500000, multiplier: 0.50, type: 'social', unusable: true },
    { id: 703, name: 'Wedding Bouquet', price: 10000, multiplier: 0.25, type: 'social', unusable: true },

    // ==========================================
    // GROUP 800 — crates (gacha crates)
    // ==========================================
    { id: 801, name: 'Common Crate', price: 10000, type: 'crate' },
    { id: 802, name: 'Rare Crate', price: 50000, type: 'crate' },
    { id: 803, name: 'Legendary Crate', price: 250000, type: 'crate' },
    { id: 804, name: 'Forbidden Crate', price: 2000000, type: 'crate' },
    { id: 805, name: 'Mythical Crate', price: 10000000, type: 'crate' },
    { id: 806, name: 'Ethereal Crate', price: 50000000, type: 'crate' },
];
