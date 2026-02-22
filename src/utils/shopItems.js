module.exports = [
    // ==========================================
    // GROUP 100 — daily (buff $daily reward)
    // ==========================================
    { id: 101, name: 'Cookie', price: 50, multiplier: 0.05, duration: 86400, type: 'daily' },
    { id: 102, name: 'Lava Lamp', price: 1500, multiplier: 0.08, duration: 604800, type: 'daily' },
    { id: 103, name: "Chef's Hat", price: 2000, multiplier: 0.20, duration: 604800, type: 'daily', idealJob: 'chef' },
    { id: 104, name: 'Shag Rug', price: 3000, multiplier: 0.15, duration: 604800, type: 'daily' },
    { id: 105, name: 'Abstract Painting', price: 5000, multiplier: 0.20, duration: 2592000, type: 'daily' },
    { id: 106, name: 'Cookbook', price: 8000, multiplier: 0.40, duration: 2592000, type: 'daily', idealJob: 'chef' },
    { id: 107, name: 'Moai Statue', price: 10000, multiplier: 0.35, duration: 2592000, type: 'daily' },
    { id: 108, name: 'VIP Golden Ticket', price: 50000, multiplier: 1.00, duration: 2592000, type: 'daily' },
    { id: 109, name: 'Mansion', price: 250000, multiplier: 2.00, duration: 2592000, type: 'daily', idealJob: 'streamer' },
    { id: 110, name: 'Space Station', price: 500000, multiplier: 5.00, duration: 2592000, type: 'daily', idealJob: 'hacker' },

    // ==========================================
    // GROUP 200 — income (buff $work, $fish, $search)
    // ==========================================
    { id: 201, name: 'Smartphone', price: 1000, multiplier: 0.10, duration: 604800, type: 'income' },
    { id: 202, name: 'Shield', price: 1000, multiplier: 0.05, duration: 604800, type: 'income', idealJob: 'police' },
    { id: 203, name: 'Knight Sword', price: 1500, multiplier: 0.15, duration: 604800, type: 'income', idealJob: 'police' },
    { id: 204, name: 'Sneakers', price: 2000, multiplier: 0.12, duration: 604800, type: 'income', idealJob: 'criminal' },
    { id: 205, name: 'Pickaxe', price: 2500, multiplier: 0.15, duration: 604800, type: 'income', idealJob: 'farmer' },
    { id: 206, name: 'RGB Keyboard', price: 2500, multiplier: 0.10, duration: 604800, type: 'income', idealJob: 'programmer' },
    { id: 207, name: 'Gaming Mouse', price: 2500, multiplier: 0.10, duration: 604800, type: 'income', idealJob: 'programmer' },
    { id: 208, name: 'Whiteboard', price: 2500, multiplier: 0.15, duration: 604800, type: 'income', idealJob: 'teacher' },
    { id: 209, name: 'Guitar', price: 3000, multiplier: 0.15, duration: 604800, type: 'income', idealJob: 'musician' },
    { id: 210, name: '4K Monitor', price: 4000, multiplier: 0.20, duration: 604800, type: 'income', idealJob: 'streamer' },
    { id: 211, name: 'Rifle', price: 4000, multiplier: 0.20, duration: 604800, type: 'income', idealJob: 'soldier' },
    { id: 212, name: 'Laptop', price: 5000, multiplier: 0.30, duration: 2592000, type: 'income', idealJob: 'hacker' },
    { id: 213, name: 'Standing Desk', price: 6000, multiplier: 0.25, duration: 2592000, type: 'income', idealJob: 'programmer' },
    { id: 214, name: 'Trading Terminal', price: 8000, multiplier: 0.35, duration: 2592000, type: 'income', idealJob: 'trader' },
    { id: 215, name: 'Ergonomic Chair', price: 8000, multiplier: 0.35, duration: 2592000, type: 'income', idealJob: 'streamer' },
    { id: 216, name: 'Business Suit', price: 10000, multiplier: 0.40, duration: 2592000, type: 'income', idealJob: 'doctor' },
    { id: 217, name: 'Combat Armor', price: 15000, multiplier: 0.40, duration: 2592000, type: 'income', idealJob: 'soldier' },
    { id: 218, name: 'Grand Piano', price: 20000, multiplier: 0.50, duration: 2592000, type: 'income', idealJob: 'musician' },
    { id: 219, name: 'Supercar', price: 50000, multiplier: 0.80, duration: 2592000, type: 'income', idealJob: 'criminal' },
    { id: 220, name: 'Superyacht', price: 100000, multiplier: 3.00, duration: 2592000, type: 'income', idealJob: 'hacker' },

    // ==========================================
    // GROUP 300 — gamble (buff $coinflip, $slots, $dice, $blackjack, $poker)
    // ==========================================
    { id: 301, name: 'Golden Dice', price: 1500, multiplier: 0.10, duration: 604800, type: 'gamble' },
    { id: 302, name: 'Marked Deck', price: 3000, multiplier: 0.20, duration: 604800, type: 'gamble', idealJob: 'criminal' },
    { id: 303, name: 'Lucky Coin', price: 3500, multiplier: 0.18, duration: 604800, type: 'gamble', idealJob: 'trader' },
    { id: 304, name: 'Gold Ring', price: 5000, multiplier: 0.15, duration: 2592000, type: 'gamble' },
    { id: 305, name: 'Clay Chips', price: 5000, multiplier: 0.20, duration: 2592000, type: 'gamble' },
    { id: 306, name: 'Stock Chart', price: 5000, multiplier: 0.25, duration: 2592000, type: 'gamble', idealJob: 'trader' },
    { id: 307, name: '4-Leaf Clover', price: 7777, multiplier: 0.30, duration: 2592000, type: 'gamble' },
    { id: 308, name: 'Rolex', price: 10000, multiplier: 0.30, duration: 2592000, type: 'gamble', idealJob: 'doctor' },
    { id: 309, name: 'Golden Horseshoe', price: 25000, multiplier: 0.50, duration: 2592000, type: 'gamble' },
    { id: 310, name: 'Time Machine', price: 1000000, multiplier: 10.00, duration: 2592000, type: 'gamble' },

    // ==========================================
    // GROUP 400 — tool (fishing rods & baits, no duration)
    // ==========================================
    { id: 401, name: 'Worm Bait', price: 50, multiplier: 0.10, type: 'bait' },
    { id: 402, name: 'Cricket Bait', price: 150, multiplier: 0.30, type: 'bait' },
    { id: 403, name: 'Squid Bait', price: 500, multiplier: 0.80, type: 'bait' },
    { id: 404, name: 'Bamboo Rod', price: 2500, multiplier: 1.0, type: 'tool', idealJob: 'farmer' },
    { id: 405, name: 'Fiberglass Rod', price: 10000, multiplier: 1.5, type: 'tool', idealJob: 'farmer' },
    { id: 406, name: 'Carbon Rod', price: 50000, multiplier: 2.5, type: 'tool', idealJob: 'farmer' },
    { id: 407, name: 'Titanium Rod', price: 200000, multiplier: 4.0, type: 'tool', idealJob: 'farmer' },

    // ==========================================
    // GROUP 500 — other (special utility items)
    // ==========================================
    { id: 501, name: 'XP Boost Potion', price: 5000, multiplier: 0, duration: 86400, type: 'xpboost' },
    { id: 502, name: 'Shield of Protection', price: 10000, multiplier: 0, duration: 86400, type: 'robshield' },
    { id: 503, name: 'Career Change Voucher', price: 200000, multiplier: 0, type: 'other' },
];
