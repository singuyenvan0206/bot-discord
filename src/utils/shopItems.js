module.exports = [
    // --- Tier 1 (50 - 500) | Duration: 1 Day (86400) ---
    { id: 1, name: 'Cookie', price: 50, multiplier: 0.05, duration: 86400, type: 'daily' },
    { id: 2, name: 'Worm Bait', price: 50, multiplier: 0.1, type: 'bait' },
    { id: 3, name: 'Cricket Bait', price: 150, multiplier: 0.3, type: 'bait' },
    { id: 4, name: 'Squid Bait', price: 500, multiplier: 0.8, type: 'bait' },

    // --- Tier 2 (1,000 - 4,000) | Duration: 7 Days (604800) ---
    { id: 5, name: 'Smartphone', price: 1000, multiplier: 0.10, duration: 604800, type: 'daily' },
    { id: 6, name: 'Shield', price: 1000, multiplier: 0.05, duration: 604800, type: 'daily', idealJob: 'police' },
    { id: 7, name: 'Knight Sword', price: 1500, multiplier: 0.15, duration: 604800, type: 'income', idealJob: 'police' },
    { id: 8, name: 'Lava Lamp', price: 1500, multiplier: 0.08, duration: 604800, type: 'daily' },
    { id: 9, name: 'Golden Dice', price: 1500, multiplier: 0.10, duration: 604800, type: 'gamble' },
    { id: 10, name: 'Sneakers', price: 2000, multiplier: 0.12, duration: 604800, type: 'income', idealJob: 'criminal' },
    { id: 11, name: 'Bamboo Rod', price: 2500, multiplier: 1.0, type: 'tool', idealJob: 'farmer' },
    { id: 12, name: 'Pickaxe', price: 2500, multiplier: 0.15, duration: 604800, type: 'income', idealJob: 'farmer' },
    { id: 13, name: 'RGB Keyboard', price: 2500, multiplier: 0.10, duration: 604800, type: 'income', idealJob: 'programmer' },
    { id: 14, name: 'Gaming Mouse', price: 2500, multiplier: 0.10, duration: 604800, type: 'income', idealJob: 'programmer' },
    { id: 15, name: 'Shag Rug', price: 3000, multiplier: 0.15, duration: 604800, type: 'daily' },
    { id: 16, name: 'Marked Deck', price: 3000, multiplier: 0.20, duration: 604800, type: 'gamble', idealJob: 'criminal' },
    { id: 17, name: '4K Monitor', price: 4000, multiplier: 0.20, duration: 604800, type: 'income', idealJob: 'streamer' },

    // --- Tier 3 (5,000 - 25,000) | Duration: 30 Days (2592000) ---
    { id: 18, name: 'Laptop', price: 5000, multiplier: 0.30, duration: 2592000, type: 'income', idealJob: 'hacker' },
    { id: 19, name: 'Gold Ring', price: 5000, multiplier: 0.15, duration: 2592000, type: 'gamble' },
    { id: 20, name: 'Abstract Painting', price: 5000, multiplier: 0.20, duration: 2592000, type: 'daily' },
    { id: 21, name: 'Clay Chips', price: 5000, multiplier: 0.20, duration: 2592000, type: 'gamble' },
    { id: 22, name: 'Standing Desk', price: 6000, multiplier: 0.25, duration: 2592000, type: 'income', idealJob: 'programmer' },
    { id: 23, name: '4-Leaf Clover', price: 7777, multiplier: 0.30, duration: 2592000, type: 'gamble' },
    { id: 24, name: 'Ergonomic Chair', price: 8000, multiplier: 0.35, duration: 2592000, type: 'income', idealJob: 'streamer' },
    { id: 25, name: 'Business Suit', price: 10000, multiplier: 0.40, duration: 2592000, type: 'income', idealJob: 'doctor' },
    { id: 26, name: 'Fiberglass Rod', price: 10000, multiplier: 1.5, type: 'tool', idealJob: 'farmer' },
    { id: 27, name: 'Rolex', price: 10000, multiplier: 0.30, duration: 2592000, type: 'gamble', idealJob: 'doctor' },
    { id: 28, name: 'Moai Statue', price: 10000, multiplier: 0.35, duration: 2592000, type: 'daily' },
    { id: 29, name: 'Golden Horseshoe', price: 25000, multiplier: 0.50, duration: 2592000, type: 'gamble' },

    // --- Tier 4 (50,000+) | Duration: 30 Days (2592000) ---
    { id: 30, name: 'VIP Golden Ticket', price: 50000, multiplier: 1.00, duration: 2592000, type: 'daily' },
    { id: 31, name: 'Carbon Rod', price: 50000, multiplier: 2.5, type: 'tool', idealJob: 'farmer' },
    { id: 32, name: 'Supercar', price: 50000, multiplier: 0.80, duration: 2592000, type: 'income', idealJob: 'criminal' },
    { id: 33, name: 'Mansion', price: 250000, multiplier: 2.00, duration: 2592000, type: 'daily', idealJob: 'streamer' },
    { id: 34, name: 'Superyacht', price: 1000000, multiplier: 3.00, duration: 2592000, type: 'income', idealJob: 'hacker' },
    { id: 35, name: 'Space Station', price: 5000000, multiplier: 5.00, duration: 2592000, type: 'daily', idealJob: 'hacker' },
    { id: 36, name: 'Time Machine', price: 10000000, multiplier: 10.00, duration: 2592000, type: 'gamble' },
    { id: 37, name: 'Career Change Voucher', price: 50000, multiplier: 0, type: 'other' }
];
