module.exports = [
    // ==========================================
    // GROUP 100 — daily (buff $daily reward)
    // ==========================================
    { id: 101, name: 'Cookie', price: 100, multiplier: 0.10, duration: 86400, type: 'daily' },
    { id: 102, name: 'Lava Lamp', price: 2500, multiplier: 0.15, duration: 604800, type: 'daily' },
    { id: 103, name: "Chef's Hat", price: 5000, multiplier: 0.25, duration: 604800, type: 'daily', idealJob: 'chef' },
    { id: 104, name: 'Shag Rug', price: 8000, multiplier: 0.20, duration: 604800, type: 'daily' },
    { id: 105, name: 'Abstract Painting', price: 15000, multiplier: 0.30, duration: 2592000, type: 'daily' },
    { id: 106, name: 'Cookbook', price: 20000, multiplier: 0.45, duration: 2592000, type: 'daily', idealJob: 'chef' },
    { id: 107, name: 'Moai Statue', price: 35000, multiplier: 0.40, duration: 2592000, type: 'daily' },
    { id: 108, name: 'VIP Golden Ticket', price: 80000, multiplier: 1.00, duration: 2592000, type: 'daily' },
    { id: 109, name: 'Mansion', price: 450000, multiplier: 2.50, duration: 2592000, type: 'daily', idealJob: 'streamer' },
    { id: 110, name: 'Space Station', price: 1500000, multiplier: 4.50, duration: 2592000, type: 'daily', idealJob: 'hacker' },

    // ==========================================
    // GROUP 200 — income (buff $work, $fish, $search)
    // ==========================================
    { id: 201, name: 'Smartphone', price: 1500, multiplier: 0.12, duration: 604800, type: 'income' },
    { id: 202, name: 'Shield', price: 2000, multiplier: 0.10, duration: 604800, type: 'income', idealJob: 'police' },
    { id: 203, name: 'Knight Sword', price: 5000, multiplier: 0.20, duration: 604800, type: 'income', idealJob: 'police' },
    { id: 204, name: 'Sneakers', price: 6000, multiplier: 0.18, duration: 604800, type: 'income', idealJob: 'criminal' },
    { id: 205, name: 'Pickaxe', price: 7500, multiplier: 0.22, duration: 604800, type: 'income', idealJob: 'farmer' },
    { id: 206, name: 'RGB Keyboard', price: 8000, multiplier: 0.20, duration: 604800, type: 'income', idealJob: 'programmer' },
    { id: 207, name: 'Gaming Mouse', price: 8000, multiplier: 0.20, duration: 604800, type: 'income', idealJob: 'programmer' },
    { id: 208, name: 'Whiteboard', price: 10000, multiplier: 0.30, duration: 604800, type: 'income', idealJob: 'teacher' },
    { id: 209, name: 'Guitar', price: 12000, multiplier: 0.35, duration: 604800, type: 'income', idealJob: 'musician' },
    { id: 210, name: '4K Monitor', price: 15000, multiplier: 0.40, duration: 604800, type: 'income', idealJob: 'streamer' },
    { id: 211, name: 'Rifle', price: 18000, multiplier: 0.45, duration: 604800, type: 'income', idealJob: 'soldier' },
    { id: 212, name: 'Laptop', price: 25000, multiplier: 0.60, duration: 2592000, type: 'income', idealJob: 'hacker' },
    { id: 213, name: 'Standing Desk', price: 30000, multiplier: 0.55, duration: 2592000, type: 'income', idealJob: 'programmer' },
    { id: 214, name: 'Trading Terminal', price: 45000, multiplier: 0.75, duration: 2592000, type: 'income', idealJob: 'trader' },
    { id: 215, name: 'Ergonomic Chair', price: 50000, multiplier: 0.80, duration: 2592000, type: 'income', idealJob: 'streamer' },
    { id: 216, name: 'Business Suit', price: 65000, multiplier: 1.00, duration: 2592000, type: 'income', idealJob: 'doctor' },
    { id: 217, name: 'Combat Armor', price: 80000, multiplier: 1.20, duration: 2592000, type: 'income', idealJob: 'soldier' },
    { id: 218, name: 'Grand Piano', price: 120000, multiplier: 1.50, duration: 2592000, type: 'income', idealJob: 'musician' },
    { id: 219, name: 'Supercar', price: 250000, multiplier: 2.20, duration: 2592000, type: 'income', idealJob: 'criminal' },
    { id: 220, name: 'Superyacht', price: 850000, multiplier: 4.00, duration: 2592000, type: 'income', idealJob: 'hacker' },

    // ==========================================
    // GROUP 300 — gamble (buff $coinflip, $slots, $dice, $blackjack, $poker)
    // ==========================================
    { id: 301, name: 'Golden Dice', price: 5000, multiplier: 0.15, duration: 604800, type: 'gamble' },
    { id: 302, name: 'Marked Deck', price: 8000, multiplier: 0.25, duration: 604800, type: 'gamble', idealJob: 'criminal' },
    { id: 303, name: 'Lucky Coin', price: 10000, multiplier: 0.20, duration: 604800, type: 'gamble', idealJob: 'trader' },
    { id: 304, name: 'Gold Ring', price: 15000, multiplier: 0.25, duration: 2592000, type: 'gamble' },
    { id: 305, name: 'Clay Chips', price: 20000, multiplier: 0.30, duration: 2592000, type: 'gamble' },
    { id: 306, name: 'Stock Chart', price: 25000, multiplier: 0.40, duration: 2592000, type: 'gamble', idealJob: 'trader' },
    { id: 307, name: '4-Leaf Clover', price: 40000, multiplier: 0.50, duration: 2592000, type: 'gamble' },
    { id: 308, name: 'Rolex', price: 60000, multiplier: 0.60, duration: 2592000, type: 'gamble', idealJob: 'doctor' },
    { id: 309, name: 'Golden Horseshoe', price: 150000, multiplier: 1.20, duration: 2592000, type: 'gamble' },
    { id: 310, name: 'Time Machine', price: 2500000, multiplier: 8.00, duration: 2592000, type: 'gamble' },

    // ==========================================
    // GROUP 400 — tool (fishing rods & baits, no duration)
    // ==========================================
    { id: 401, name: 'Worm Bait', price: 50, multiplier: 0.10, type: 'bait' },
    { id: 402, name: 'Cricket Bait', price: 250, multiplier: 0.30, type: 'bait' },
    { id: 403, name: 'Squid Bait', price: 1000, multiplier: 0.80, type: 'bait' },
    { id: 404, name: 'Bamboo Rod', price: 5000, multiplier: 1.0, type: 'tool', idealJob: 'farmer' },
    { id: 405, name: 'Fiberglass Rod', price: 25000, multiplier: 1.5, type: 'tool', idealJob: 'farmer' },
    { id: 406, name: 'Carbon Rod', price: 120000, multiplier: 2.5, type: 'tool', idealJob: 'farmer' },
    { id: 407, name: 'Titanium Rod', price: 500000, multiplier: 4.0, type: 'tool', idealJob: 'farmer' },

    // ==========================================
    // GROUP 500 — other (special utility items)
    // ==========================================
    { id: 501, name: 'XP Boost Potion', price: 100000, multiplier: 0, duration: 86400, type: 'xpboost' },
    { id: 502, name: 'Shield of Protection', price: 2000, multiplier: 0, duration: 86400, type: 'robshield' },
    { id: 503, name: 'Career Change Voucher', price: 2000000, multiplier: 0, type: 'other' },
];
