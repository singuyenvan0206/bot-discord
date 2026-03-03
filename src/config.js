module.exports = {
    PREFIX: '$',
    BUTTON_ID: 'join_giveaway_btn',
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
        WORDCHAIN_REWARD: 200,
        SCRAMBLE_REWARD: 3000,
        HANGMAN_REWARD: 3000,
        GUESS_REWARD_BASE: 7000,
        MEMORY_REWARD_BASE: 7000,
        EMOJIQUIZ_REWARD: 6000,
        TICTACTOE_REWARD: 6000,
        TRIVIA_REWARD: 6000,
        WORK_COOLDOWN: 3600, // 1 hour in seconds
        DAILY_COOLDOWN: 86400, // 24 hours in seconds
        DAILY_REWARD: 10000,
        FISH_COOLDOWN: 15,
        SELL_RECOVERY: 0.7, // 70% return
        MIN_WORK_EARNINGS: 3000,
        MAX_WORK_EARNINGS: 15000,
        CRIME_COOLDOWN: 3600, // 1 hour
        CRIME_SUCCESS_RATE: 0.45,
        CRIME_MIN_REWARD: 8000,
        CRIME_MAX_REWARD: 20000,
        PENALTY_PER_LEVEL: 500, // Fixed penalty amount per level
        FREELANCE_COOLDOWN: 7200, // 2 hours
        FREELANCE_SUCCESS_RATE: 0.6,
        FREELANCE_MIN_REWARD: 5000,
        FREELANCE_MAX_REWARD: 15000,
        FREELANCE_FAIL_PENALTY: 2000, // Fixed fine
        BEG_COOLDOWN: 300, // 5 minutes
        BEG_SUCCESS_RATE: 0.55,
        BEG_MIN_REWARD: 1000,
        BEG_MAX_REWARD: 3000,
        SEARCH_COOLDOWN: 600, // 10 minutes
        SEARCH_MIN_REWARD: 3000,
        SEARCH_MAX_REWARD: 12000,
        ROB_COOLDOWN: 3600, // 1 hour
        ROB_SUCCESS_CHANCE: 0.45,
        MAX_BET: 500000,
        HOUSE_DISTRIBUTION_INTERVAL: 21600, // 6 hours in seconds
        HOUSE_DISTRIBUTION_MIN_POOL: 1000, // Only distribute if bot has > 1000 coins
        DEFAULT_COOLDOWN: 3,
        JOBS: {
            police: { id: 'police', numericId: 1, bonus: 0.70, color: '#3498db', icon: '👮' },
            criminal: { id: 'criminal', numericId: 2, bonus: 1.00, color: '#e74c3c', icon: '🥷' },
            doctor: { id: 'doctor', numericId: 3, bonus: 1.10, color: '#2ecc71', icon: '👨‍⚕️' },
            programmer: { id: 'programmer', numericId: 4, bonus: 1.30, color: '#9b59b6', icon: '💻' },
            farmer: { id: 'farmer', numericId: 5, bonus: 0.80, color: '#f1c40f', icon: '👨‍🌾', luck: 1.5 },
            hacker: { id: 'hacker', numericId: 6, bonus: 1.50, color: '#27ae60', icon: '👨‍💻' },
            streamer: { id: 'streamer', numericId: 7, bonus: 1.00, color: '#6441a5', icon: '🎥' },
            chef: { id: 'chef', numericId: 8, bonus: 1.00, color: '#e67e22', icon: '👨‍🍳' },
            musician: { id: 'musician', numericId: 9, bonus: 0.90, color: '#1abc9c', icon: '🎸' },
            trader: { id: 'trader', numericId: 10, bonus: 1.10, color: '#f39c12', icon: '📈' },
            teacher: { id: 'teacher', numericId: 11, bonus: 0.90, color: '#95a5a6', icon: '👩‍🏫' }
        },
        LEVELING: {
            XP_MULTIPLIER: 1 // Triple the XP gain for faster progression
        },
        LOTTERY: {
            TICKET_PRICE: 10000,
            DRAW_INTERVAL: 86400, // 24 hours
            INITIAL_JACKPOT: 0
        }
    },
    BLACKLISTED_CHANNELS: ['842400189830529035'],
    OWNER_ID: '765577989663883364'
};
