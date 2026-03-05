module.exports = [
    // ==========================================
    // GROUP 100 — daily (buff $daily reward)
    // ==========================================
    { id: 101, name: 'Cookie', price: 100, multiplier: 0.02, duration: 86400, type: 'daily', emoji: '🍪' },
    { id: 102, name: 'Shag Rug', price: 12000, multiplier: 0.05, duration: 604800, type: 'daily', emoji: '🧵' },
    { id: 103, name: 'Moai Statue', price: 120000, multiplier: 0.15, duration: 2592000, type: 'daily', emoji: '🗿' },
    { id: 104, name: 'VIP Golden Ticket', price: 500000, multiplier: 0.30, duration: 2592000, type: 'daily', emoji: '🎫' },
    { id: 105, name: 'Space Station', price: 2000000, multiplier: 0.60, duration: 2592000, type: 'daily', emoji: '🛰️' },

    // ==========================================
    // GROUP 200 — income (buff $work, $fish, $search)
    // ==========================================
    { id: 201, name: 'Smartphone', price: 20000, multiplier: 0.02, duration: 604800, type: 'income', emoji: '📱' },
    { id: 202, name: 'RGB Keyboard', price: 150000, multiplier: 0.08, duration: 604800, type: 'income', emoji: '⌨️' },
    { id: 203, name: '4K Monitor', price: 400000, multiplier: 0.15, duration: 604800, type: 'income', emoji: '🖥️' },
    { id: 204, name: 'Trading Terminal', price: 1000000, multiplier: 0.30, duration: 2592000, type: 'income', emoji: '📈' },
    { id: 205, name: 'Superyacht', price: 3000000, multiplier: 0.60, duration: 2592000, type: 'income', emoji: '🛳️' },

    // ==========================================
    // GROUP 300 — gamble (buff $coinflip, $slots, $dice, $blackjack)
    // ==========================================
    { id: 301, name: 'Golden Dice', price: 8000, multiplier: 0.05, duration: 604800, type: 'gamble', emoji: '🎲' },
    { id: 302, name: 'Emerald Necklace', price: 100000, multiplier: 0.15, duration: 2592000, type: 'gamble', emoji: '📿' },
    { id: 303, name: 'Clay Chips', price: 200000, multiplier: 0.25, duration: 2592000, type: 'gamble', emoji: '🪙' },
    { id: 304, name: '4-Leaf Clover', price: 500000, multiplier: 0.40, duration: 2592000, type: 'gamble', emoji: '🍀' },
    { id: 305, name: 'Time Machine', price: 1500000, multiplier: 0.70, duration: 2592000, type: 'gamble', emoji: '⏳' },

    // ==========================================
    // GROUP 400 — bait (fishing baits)
    // ==========================================
    { id: 401, name: 'Bread Bait', price: 200, multiplier: 0.05, type: 'bait', emoji: '🍞' },
    { id: 402, name: 'Worm Bait', price: 400, multiplier: 0.15, type: 'bait', emoji: '🪱' },
    { id: 403, name: 'Shrimp Bait', price: 1000, multiplier: 0.40, type: 'bait', emoji: '🦐' },
    { id: 404, name: 'Cricket Bait', price: 2000, multiplier: 0.75, type: 'bait', emoji: '🦗' },
    { id: 405, name: 'Squid Bait', price: 4000, multiplier: 1.50, type: 'bait', emoji: '🦑' },
    { id: 406, name: 'Golden Bait', price: 10000, multiplier: 3.00, type: 'bait', emoji: '🧈' },

    // ==========================================
    // GROUP 450 — tool (fishing rods, no duration)
    // ==========================================
    { id: 407, name: 'Plastic Rod', price: 25000, multiplier: 0.5, type: 'tool', emoji: '🎣' },
    { id: 408, name: 'Bamboo Rod', price: 50000, multiplier: 0.8, type: 'tool', emoji: '🎍' },
    { id: 409, name: 'Fiberglass Rod', price: 100000, multiplier: 1.1, type: 'tool', emoji: '🧵' },
    { id: 410, name: 'Steel Rod', price: 120000, multiplier: 1.4, type: 'tool', emoji: '🔩' },
    { id: 411, name: 'Carbon Rod', price: 350000, multiplier: 1.8, type: 'tool', emoji: '🌑' },
    { id: 412, name: 'Titanium Rod', price: 800000, multiplier: 2.3, type: 'tool', emoji: '🥈' },
    { id: 413, name: "Neptune's Rod", price: 2000000, multiplier: 3.0, type: 'tool', emoji: '🔱' },

    // ==========================================
    // GROUP 500 — other (special utility items)
    // ==========================================
    { id: 501, name: 'Shield of Protection', price: 5000, multiplier: 0, duration: 86400, type: 'robshield', emoji: '🛡️' },
    { id: 502, name: 'XP Boost Potion', price: 100000, multiplier: 0, duration: 86400, type: 'xpboost', emoji: '🧪' },
    { id: 503, name: 'Career Change Voucher', price: 2000000, multiplier: 0, type: 'other', emoji: '🎫' },

    // ==========================================
    // GROUP 600 — event (buffs given by events/catches)
    // ==========================================
    { id: 601, name: "Megalodon's Blessing", price: 0, multiplier: 0.15, duration: 3600, type: 'income', unbuyable: true, emoji: '🦈' },
    { id: 602, name: "Poseidon's Favor", price: 0, multiplier: 0.30, duration: 7200, type: 'income', unbuyable: true, emoji: '🔱' },
    { id: 603, name: "Pearl's Radiance", price: 0, multiplier: 0.10, duration: 3600, type: 'income', unbuyable: true, emoji: '🔮' },
    { id: 604, name: "Kraken's Might", price: 0, multiplier: 0.20, duration: 5400, type: 'income', unbuyable: true, emoji: '🐙' },
    { id: 605, name: "Turtle's Longevity", price: 0, multiplier: 0.25, duration: 10800, type: 'income', unbuyable: true, emoji: '🐢' },
    { id: 606, name: "Dragon's Majesty", price: 0, multiplier: 0.40, duration: 7200, type: 'income', unbuyable: true, emoji: '🐉' },
    { id: 607, name: "Galaxy's Aura", price: 0, multiplier: 0.50, duration: 10800, type: 'income', unbuyable: true, emoji: '🌌' },
    { id: 608, name: "Void's Blessing", price: 0, multiplier: 0.75, duration: 14400, type: 'income', unbuyable: true, emoji: '🌀' },
    { id: 615, name: "Dragonfish's Wisdom", price: 0, multiplier: 0.20, duration: 3600, type: 'xp', unbuyable: true, emoji: '🐉' },
    { id: 616, name: "Phoenix's Rebirth", price: 0, multiplier: 0.25, duration: 3600, type: 'xp', unbuyable: true, emoji: '🔥' },
    { id: 617, name: "Angler's Insight", price: 0, multiplier: 0.15, duration: 1800, type: 'xp', unbuyable: true, emoji: '🏮' },
    { id: 618, name: "Treasure's Luck", price: 0, multiplier: 0.10, duration: 1800, type: 'xp', unbuyable: true, emoji: '💰' },

    // ==========================================
    // GROUP 700 — social (marriage items)
    // ==========================================
    { id: 701, name: 'Wedding Ring', price: 50000, multiplier: 0.25, type: 'social', unusable: true, emoji: '💍' },
    { id: 702, name: 'Diamond Ring', price: 500000, multiplier: 0.50, type: 'social', unusable: true, emoji: '💎' },
    { id: 703, name: 'Wedding Bouquet', price: 10000, multiplier: 0.25, type: 'social', unusable: true, emoji: '💐' },

    // ==========================================
    // GROUP 800 — crates (gacha crates)
    // ==========================================
    { id: 801, name: 'Common Crate', price: 10000, type: 'crate', emoji: '📦' },
    { id: 802, name: 'Rare Crate', price: 50000, type: 'crate', emoji: '🎁' },
    { id: 803, name: 'Legendary Crate', price: 250000, type: 'crate', emoji: '💎' },
    { id: 804, name: 'Forbidden Crate', price: 1000000, type: 'crate', emoji: '💀' },
    { id: 805, name: 'Mythical Crate', price: 4000000, type: 'crate', emoji: '🔮' },
    { id: 806, name: 'Ethereal Crate', price: 20000000, type: 'crate', emoji: '🌌' },
];
