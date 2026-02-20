module.exports = [
    // --- Tier 1 (50 - 500) ---
    { id: 1, name: '🍪 Cookies', price: 50, description: 'Sugar rush! (+1% Daily Reward)', multiplier: 0.01, type: 'daily' },
    { id: 2, name: '🪱 Worm Bait', price: 50, description: 'Single-use bait. Required to fish. (Luck: +10%)', multiplier: 0.1, type: 'bait' },
    { id: 3, name: '🦗 Cricket Bait', price: 150, description: 'Tasty treat for fish. (Luck: +30%)', multiplier: 0.3, type: 'bait' },
    { id: 4, name: '🦑 Squid Bait', price: 500, description: 'Irresistible to big fish. (Luck: +80%)', multiplier: 0.8, type: 'bait' },

    // --- Tier 2 (1,000 - 4,000) ---
    { id: 5, name: '📱 Phone', price: 1000, description: 'Stay connected (+5% Daily Reward)', multiplier: 0.05, type: 'daily' },
    { id: 6, name: '🛡️ Shield', price: 1000, description: 'Protect your assets (+3% Daily Reward)', multiplier: 0.03, type: 'daily' },
    { id: 7, name: '⚔️ Sword', price: 1500, description: 'Become a mercenary (+5% Work Income)', multiplier: 0.05, type: 'income' },
    { id: 8, name: '🛋️ Lava Lamp', price: 1500, description: 'Groovy vibes (+2% Daily)', multiplier: 0.02, type: 'daily' },
    { id: 9, name: '🎲 Gold Dice', price: 1500, description: 'Roll high (+2% Gamble)', multiplier: 0.02, type: 'gamble' },
    { id: 10, name: '👟 Sneakers', price: 2000, description: 'Run faster (+2% Work)', multiplier: 0.02, type: 'income' },
    { id: 11, name: '🎣 Bamboo Rod (Tier 1)', price: 2500, description: 'Basic rod. (Luck: 1.0x)', multiplier: 1.0, type: 'tool' },
    { id: 12, name: '⛏️ Mining Pick', price: 2500, description: 'Dig for treasures! (+5% Work Income)', multiplier: 0.05, type: 'income' },
    { id: 13, name: '⌨️ RGB Keyboard', price: 2500, description: 'Click clack (+3% Work)', multiplier: 0.03, type: 'income' },
    { id: 14, name: '🖱️ Gaming Mouse', price: 2500, description: 'Precise clicks (+3% Work)', multiplier: 0.03, type: 'income' },
    { id: 15, name: '🧸 Fluffy Rug', price: 3000, description: 'Soft toes (+4% Daily)', multiplier: 0.04, type: 'daily' },
    { id: 16, name: '🃏 Marked Cards', price: 3000, description: 'Know when to hold (+4% Gamble)', multiplier: 0.04, type: 'gamble' },
    { id: 17, name: '🖥️ 4K Monitor', price: 4000, description: 'Crystal clear (+5% Work)', multiplier: 0.05, type: 'income' },

    // --- Tier 3 (5,000 - 25,000) ---
    { id: 18, name: '💻 Laptop', price: 5000, description: 'Work harder! (+10% Work Income)', multiplier: 0.10, type: 'income' },
    { id: 19, name: '💍 Gold Ring', price: 5000, description: 'Shiny and precious (+5% Gamble Win)', multiplier: 0.05, type: 'gamble' },
    { id: 20, name: '🎨 Abstract Art', price: 5000, description: 'Classy decor (+6% Daily)', multiplier: 0.06, type: 'daily' },
    { id: 21, name: '🪙 Clay Chips', price: 5000, description: 'Pro feel (+6% Gamble)', multiplier: 0.06, type: 'gamble' },
    { id: 22, name: '🪑 Standing Desk', price: 6000, description: 'Better posture (+7% Work)', multiplier: 0.07, type: 'income' },
    { id: 23, name: '🍀 Lucky Clover', price: 7777, description: 'Feel lucky? (+7% Gambling Winnings)', multiplier: 0.07, type: 'gamble' },
    { id: 24, name: '💺 Ergonomic Chair', price: 8000, description: 'Comfy working (+9% Work)', multiplier: 0.09, type: 'income' },
    { id: 25, name: '👔 Business Suit', price: 10000, description: 'Look professional (+20% Work Income)', multiplier: 0.20, type: 'income' },
    { id: 26, name: '🎣 Fiberglass Rod (Tier 2)', price: 10000, description: 'Catch better fish! (Luck: 1.5x)', multiplier: 1.5, type: 'tool' },
    { id: 27, name: '⌚ Rolex Watch', price: 10000, description: 'Time is money (+10% Gamble Win)', multiplier: 0.10, type: 'gamble' },
    { id: 28, name: '🗿 Stone Statue', price: 10000, description: 'Rock solid (+12% Daily)', multiplier: 0.12, type: 'daily' },
    { id: 29, name: '🎰 Lucky Token', price: 10000, description: 'Spin to win (+12% Gamble)', multiplier: 0.12, type: 'gamble' },
    { id: 30, name: '💳 VIP Card', price: 20000, description: 'Exclusive access (+50% Daily Reward)', multiplier: 0.50, type: 'daily' },
    { id: 31, name: '🐴 Golden Horseshoe', price: 25000, description: 'Pure luck (+25% Gamble)', multiplier: 0.25, type: 'gamble' },

    // --- Tier 4 (50,000+) ---
    { id: 32, name: '🎫 Golden Ticket', price: 50000, description: 'VIP perks (+50% Daily Reward)', multiplier: 0.50, type: 'daily' },
    { id: 33, name: '🎣 Carbon Fiber Rod (Tier 3)', price: 50000, description: 'Top of the line. (Luck: 2.5x)', multiplier: 2.5, type: 'tool' },
    { id: 34, name: '🏎️ Sports Car', price: 50000, description: 'Vroom vroom! (+25% Work Income)', multiplier: 0.25, type: 'income' },
    { id: 35, name: '🏰 Mansion', price: 250000, description: 'Living the high life (+100% Daily Reward)', multiplier: 1.00, type: 'daily' },
    { id: 36, name: '🛥️ Super Yacht', price: 1000000, description: 'Ocean office (+50% Work Income)', multiplier: 0.50, type: 'income' },
    { id: 37, name: '🚀 Space Station', price: 5000000, description: 'Orbital rewards (+200% Daily Reward)', multiplier: 2.00, type: 'daily' },
    { id: 38, name: '⏳ Time Machine', price: 10000000, description: 'Rewrite history (+50% Gamble Winnings)', multiplier: 0.50, type: 'gamble' }
];
