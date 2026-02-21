module.exports = [
    // --- Tier 1 (50 - 500) ---
    { id: 1, name: 'Cookie', price: 50, multiplier: 0.01, duration: 3600, type: 'daily' },
    { id: 2, name: 'Worm Bait', price: 50, multiplier: 0.1, type: 'bait' },
    { id: 3, name: 'Cricket Bait', price: 150, multiplier: 0.3, type: 'bait' },
    { id: 4, name: 'Squid Bait', price: 500, multiplier: 0.8, type: 'bait' },

    // --- Tier 2 (1,000 - 4,000) ---
    { id: 5, name: 'Smartphone', price: 1000, multiplier: 0.05, duration: 7200, type: 'daily' },
    { id: 6, name: 'Shield', price: 1000, multiplier: 0.03, duration: 14400, type: 'daily' },
    { id: 7, name: 'Knight Sword', price: 1500, multiplier: 0.05, duration: 7200, type: 'income' },
    { id: 8, name: 'Lava Lamp', price: 1500, multiplier: 0.02, duration: 7200, type: 'daily' },
    { id: 9, name: 'Golden Dice', price: 1500, multiplier: 0.02, duration: 3600, type: 'gamble' },
    { id: 10, name: 'Sneakers', price: 2000, multiplier: 0.02, duration: 7200, type: 'income' },
    { id: 11, name: 'Bamboo Rod', price: 2500, multiplier: 1.0, type: 'tool' },
    { id: 12, name: 'Pickaxe', price: 2500, multiplier: 0.05, duration: 7200, type: 'income' },
    { id: 13, name: 'RGB Keyboard', price: 2500, multiplier: 0.03, duration: 7200, type: 'income' },
    { id: 14, name: 'Gaming Mouse', price: 2500, multiplier: 0.03, duration: 7200, type: 'income' },
    { id: 15, name: 'Shag Rug', price: 3000, multiplier: 0.04, duration: 14400, type: 'daily' },
    { id: 16, name: 'Marked Deck', price: 3000, multiplier: 0.04, duration: 3600, type: 'gamble' },
    { id: 17, name: '4K Monitor', price: 4000, multiplier: 0.05, duration: 14400, type: 'income' },

    // --- Tier 3 (5,000 - 25,000) ---
    { id: 18, name: 'Laptop', price: 5000, multiplier: 0.10, duration: 14400, type: 'income' },
    { id: 19, name: 'Gold Ring', price: 5000, multiplier: 0.05, duration: 7200, type: 'gamble' },
    { id: 20, name: 'Abstract Painting', price: 5000, multiplier: 0.06, duration: 28800, type: 'daily' },
    { id: 21, name: 'Clay Chips', price: 5000, multiplier: 0.06, duration: 7200, type: 'gamble' },
    { id: 22, name: 'Standing Desk', price: 6000, multiplier: 0.07, duration: 14400, type: 'income' },
    { id: 23, name: '4-Leaf Clover', price: 7777, multiplier: 0.07, duration: 7200, type: 'gamble' },
    { id: 24, name: 'Ergonomic Chair', price: 8000, multiplier: 0.09, duration: 14400, type: 'income' },
    { id: 25, name: 'Business Suit', price: 10000, multiplier: 0.20, duration: 86400, type: 'income' },
    { id: 26, name: 'Fiberglass Rod', price: 10000, multiplier: 1.5, type: 'tool' },
    { id: 27, name: 'Rolex', price: 10000, multiplier: 0.10, duration: 14400, type: 'gamble' },
    { id: 28, name: 'Moai Statue', price: 10000, multiplier: 0.12, duration: 86400, type: 'daily' },
    { id: 29, name: 'Golden Horseshoe', price: 25000, multiplier: 0.25, duration: 14400, type: 'gamble' },

    // --- Tier 4 (50,000+) ---
    { id: 30, name: 'VIP Golden Ticket', price: 50000, multiplier: 0.50, duration: 172800, type: 'daily' },
    { id: 31, name: 'Carbon Rod', price: 50000, multiplier: 2.5, type: 'tool' },
    { id: 32, name: 'Supercar', price: 50000, multiplier: 0.25, duration: 86400, type: 'income' },
    { id: 33, name: 'Mansion', price: 250000, multiplier: 1.00, duration: 604800, type: 'daily' },
    { id: 34, name: 'Superyacht', price: 1000000, multiplier: 0.50, duration: 259200, type: 'income' },
    { id: 35, name: 'Space Station', price: 5000000, multiplier: 2.00, duration: 2592000, type: 'daily' },
    { id: 36, name: 'Time Machine', price: 10000000, multiplier: 0.50, duration: 3600, type: 'gamble' },
    { id: 37, name: 'Career Change Voucher', price: 50000, multiplier: 0, type: 'other' }
];
