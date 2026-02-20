module.exports = {
    PREFIX: '$',
    COLORS: {
        ACTIVE: 0x5865F2,        // Discord Blurple
        ENDING_SOON: 0xFEE75C,   // Yellow
        ENDED: 0x57F287,         // Green
        ERROR: 0xED4245,         // Red
        INFO: 0x3498DB,          // Blue
        PAUSED: 0xF0B232,        // Orange-Yellow
        SCHEDULED: 0x9B59B6,     // Purple
        SUCCESS: 0x2ECC71,       // Green
        WARNING: 0xF1C40F,       // Yellow
        NEUTRAL: 0x95A5A6,       // Gray
        GAMBLE_PUSH: 0xF39C12,   // Orange
        GAMBLE_WIN: 0x2ECC71,    // Green
        GAMBLE_LOSS: 0xE74C3C    // Red
    },
    EMOJIS: {
        GIVEAWAY: '🎉',
        SUCCESS: '✅',
        ERROR: '❌',
        WAITING: '⏳',
        LOADING: '🔍',
        STOP: '🛑',
        INFO: 'ℹ️',
        COIN: '💰',
        LUCKY: '🍀',
        WORK: '🔨',
        FISH: '🎣',
        GAMBLE: '🎲',
        BLACKJACK: '🃏',
        TIMER: '⏰'
    },
    CARDS: {
        SUITS: ['♠️', '♥️', '♦️', '♣️'],
        VALUES: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    },
    API_URLS: {
        DICTIONARY: 'https://api.dictionaryapi.dev/api/v2/entries/en/'
    },
    ECONOMY: {
        WORDCHAIN_REWARD: 5,
        SCRAMBLE_REWARD: 50,
        HANGMAN_REWARD: 50,
        GUESS_REWARD_BASE: 100,
        MEMORY_REWARD_BASE: 100,
        EMOJIQUIZ_REWARD: 150,
        TICTACTOE_REWARD: 100,
        TRIVIA_REWARD: 100,
        REACTION_REWARD_BASE: 15,
        WORK_COOLDOWN: 3600, // 1 hour in seconds
        DAILY_COOLDOWN: 86400, // 24 hours in seconds
        DAILY_REWARD: 500,
        FISH_COOLDOWN: 60,
        SELL_RECOVERY: 0.7, // 70% return
        MIN_WORK_EARNINGS: 100,
        MAX_WORK_EARNINGS: 300,
        MAX_BET: 250000,
        DEFAULT_COOLDOWN: 3
    }
};
