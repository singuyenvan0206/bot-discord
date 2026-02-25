module.exports = [
    // ==========================================
    // GROUP 100 — daily (buff $daily reward)
    // ==========================================
    // Formula: Price / (Multi * Days)
    { id: 101, name: 'Cookie', price: 100, multiplier: 0.10, duration: 86400, type: 'daily' }, // CMD 1000
    { id: 102, name: 'Lava Lamp', price: 3500, multiplier: 0.20, duration: 604800, type: 'daily' }, // CMD 2500
    { id: 103, name: "Chef's Hat", price: 5000, multiplier: 0.30, duration: 604800, type: 'daily', idealJob: 'chef' }, // CMD 2380
    { id: 104, name: 'Shag Rug', price: 12000, multiplier: 0.40, duration: 604800, type: 'daily' }, // CMD 4285
    { id: 105, name: 'Abstract Painting', price: 60000, multiplier: 0.40, duration: 2592000, type: 'daily' }, // CMD 5000
    { id: 106, name: 'Cookbook', price: 80000, multiplier: 0.60, duration: 2592000, type: 'daily', idealJob: 'chef' }, // CMD 4444
    { id: 107, name: 'Moai Statue', price: 120000, multiplier: 0.80, duration: 2592000, type: 'daily' }, // CMD 5000
    { id: 108, name: 'VIP Golden Ticket', price: 250000, multiplier: 1.50, duration: 2592000, type: 'daily' },
    { id: 109, name: 'Mansion', price: 750000, multiplier: 3.00, duration: 2592000, type: 'daily', idealJob: 'streamer' }, // CMD 8333
    { id: 110, name: 'Space Station', price: 2500000, multiplier: 5.00, duration: 2592000, type: 'daily', idealJob: 'hacker' }, // CMD 16666

    // ==========================================
    // GROUP 200 — income (buff $work, $fish, $search)
    // ==========================================
    { id: 201, name: 'Smartphone', price: 2000, multiplier: 0.15, duration: 604800, type: 'income' }, // CMD 1904
    { id: 202, name: 'Shield', price: 2500, multiplier: 0.12, duration: 604800, type: 'income', idealJob: 'police' },
    { id: 203, name: 'Knight Sword', price: 6000, multiplier: 0.30, duration: 604800, type: 'income', idealJob: 'police' },
    { id: 204, name: 'Sneakers', price: 8000, multiplier: 0.25, duration: 604800, type: 'income', idealJob: 'criminal' },
    { id: 205, name: 'Pickaxe', price: 10000, multiplier: 0.35, duration: 604800, type: 'income', idealJob: 'farmer' },
    { id: 206, name: 'RGB Keyboard', price: 12000, multiplier: 0.40, duration: 604800, type: 'income', idealJob: 'programmer' },
    { id: 207, name: 'Gaming Mouse', price: 12000, multiplier: 0.40, duration: 604800, type: 'income', idealJob: 'programmer' },
    { id: 208, name: 'Whiteboard', price: 15000, multiplier: 0.50, duration: 604800, type: 'income', idealJob: 'teacher' },
    { id: 209, name: 'Guitar', price: 18000, multiplier: 0.60, duration: 604800, type: 'income', idealJob: 'musician' },
    { id: 210, name: '4K Monitor', price: 25000, multiplier: 0.70, duration: 604800, type: 'income', idealJob: 'streamer' },
    { id: 211, name: 'Rifle', price: 30000, multiplier: 0.80, duration: 604800, type: 'income', idealJob: 'soldier' },
    { id: 212, name: 'Laptop', price: 100000, multiplier: 0.60, duration: 2592000, type: 'income', idealJob: 'hacker' }, // CMD 5555
    { id: 213, name: 'Standing Desk', price: 120000, multiplier: 0.75, duration: 2592000, type: 'income', idealJob: 'programmer' },
    { id: 214, name: 'Trading Terminal', price: 180000, multiplier: 1.00, duration: 2592000, type: 'income', idealJob: 'trader' },
    { id: 215, name: 'Ergonomic Chair', price: 200000, multiplier: 1.20, duration: 2592000, type: 'income', idealJob: 'streamer' },
    { id: 216, name: 'Business Suit', price: 250000, multiplier: 1.50, duration: 2592000, type: 'income', idealJob: 'doctor' },
    { id: 217, name: 'Combat Armor', price: 300000, multiplier: 1.80, duration: 2592000, type: 'income', idealJob: 'soldier' },
    { id: 218, name: 'Grand Piano', price: 500000, multiplier: 2.20, duration: 2592000, type: 'income', idealJob: 'musician' },
    { id: 219, name: 'Supercar', price: 1000000, multiplier: 3.50, duration: 2592000, type: 'income', idealJob: 'criminal' },
    { id: 220, name: 'Superyacht', price: 3500000, multiplier: 6.00, duration: 2592000, type: 'income', idealJob: 'hacker' },

    // ==========================================
    // GROUP 300 — gamble (buff $coinflip, $slots, $dice, $blackjack, $poker)
    // ==========================================
    { id: 301, name: 'Golden Dice', price: 8000, multiplier: 0.25, duration: 604800, type: 'gamble' },
    { id: 302, name: 'Marked Deck', price: 15000, multiplier: 0.40, duration: 604800, type: 'gamble', idealJob: 'criminal' },
    { id: 303, name: 'Lucky Coin', price: 20000, multiplier: 0.50, duration: 604800, type: 'gamble', idealJob: 'trader' },
    { id: 304, name: 'Gold Ring', price: 100000, multiplier: 0.50, duration: 2592000, type: 'gamble' }, // CMD 6666
    { id: 305, name: 'Clay Chips', price: 150000, multiplier: 0.70, duration: 2592000, type: 'gamble' },
    { id: 306, name: 'Stock Chart', price: 200000, multiplier: 1.00, duration: 2592000, type: 'gamble', idealJob: 'trader' },
    { id: 307, name: '4-Leaf Clover', price: 350000, multiplier: 1.50, duration: 2592000, type: 'gamble' },
    { id: 308, name: 'Rolex', price: 500000, multiplier: 2.00, duration: 2592000, type: 'gamble', idealJob: 'doctor' },
    { id: 309, name: 'Golden Horseshoe', price: 1000000, multiplier: 3.50, duration: 2592000, type: 'gamble' },
    { id: 310, name: 'Time Machine', price: 5000000, multiplier: 10.0, duration: 2592000, type: 'gamble' },

    // ==========================================
    // GROUP 400 — bait (fishing baits)
    // ==========================================
    { id: 401, name: 'Bread Bait', price: 20, multiplier: 0.05, type: 'bait' },
    { id: 402, name: 'Worm Bait', price: 150, multiplier: 0.15, type: 'bait' },
    { id: 403, name: 'Shrimp Bait', price: 800, multiplier: 0.40, type: 'bait' },
    { id: 404, name: 'Cricket Bait', price: 2500, multiplier: 0.75, type: 'bait' },
    { id: 405, name: 'Squid Bait', price: 8000, multiplier: 1.50, type: 'bait' },
    { id: 406, name: 'Golden Bait', price: 15000, multiplier: 3.00, type: 'bait' },

    // ==========================================
    // GROUP 450 — tool (fishing rods, no duration)
    // ==========================================
    { id: 407, name: 'Plastic Rod', price: 1000, multiplier: 0.5, type: 'tool', idealJob: 'farmer' },
    { id: 408, name: 'Bamboo Rod', price: 5000, multiplier: 1.0, type: 'tool', idealJob: 'farmer' },
    { id: 409, name: 'Fiberglass Rod', price: 25000, multiplier: 1.8, type: 'tool', idealJob: 'farmer' },
    { id: 410, name: 'Steel Rod', price: 100000, multiplier: 2.5, type: 'tool', idealJob: 'farmer' },
    { id: 411, name: 'Carbon Rod', price: 350000, multiplier: 3.5, type: 'tool', idealJob: 'farmer' },
    { id: 412, name: 'Titanium Rod', price: 1200000, multiplier: 5.0, type: 'tool', idealJob: 'farmer' },
    { id: 413, name: "Neptune's Rod", price: 1800000, multiplier: 7.5, type: 'tool', idealJob: 'farmer' },

    // ==========================================
    // GROUP 500 — other (special utility items)
    // ==========================================
    { id: 501, name: 'Shield of Protection', price: 5000, multiplier: 0, duration: 86400, type: 'robshield' },
    { id: 502, name: 'XP Boost Potion', price: 100000, multiplier: 0, duration: 86400, type: 'xpboost' },
    { id: 503, name: 'Career Change Voucher', price: 2000000, multiplier: 0, type: 'other' },
];
