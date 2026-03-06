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
        WORDCHAIN_REWARD: 150,
        SCRAMBLE_REWARD: 2000,
        HANGMAN_REWARD: 2000,
        GUESS_REWARD_BASE: 2500,
        MEMORY_REWARD_BASE: 2500,
        EMOJIQUIZ_REWARD: 2000,
        TICTACTOE_REWARD: 2000,
        TRIVIA_REWARD: 2000,
        WORK_COOLDOWN: 3600, // 1 hour in seconds
        DAILY_COOLDOWN: 86400, // 24 hours in seconds
        DAILY_REWARD: 10000,
        FISH_COOLDOWN: 15,
        SELL_RECOVERY: 0.7, // 50% return
        MIN_WORK_EARNINGS: 2000,
        MAX_WORK_EARNINGS: 10000,
        CRIME_COOLDOWN: 3600, // 1 hour
        CRIME_SUCCESS_RATE: 0.45,
        CRIME_MIN_REWARD: 2000,
        CRIME_MAX_REWARD: 8000,
        PENALTY_PER_LEVEL: 500, // Fixed penalty amount per level
        FREELANCE_COOLDOWN: 7200, // 2 hours
        FREELANCE_SUCCESS_RATE: 0.6,
        FREELANCE_MIN_REWARD: 1500,
        FREELANCE_MAX_REWARD: 4500,
        FREELANCE_FAIL_PENALTY: 2000, // Fixed fine
        BEG_COOLDOWN: 300, // 5 minutes
        BEG_SUCCESS_RATE: 0.55,
        BEG_MIN_REWARD: 1000,
        BEG_MAX_REWARD: 3000,
        SEARCH_COOLDOWN: 600, // 10 minutes
        SEARCH_MIN_REWARD: 500,
        SEARCH_MAX_REWARD: 3000,
        ROB_COOLDOWN: 3600, // 1 hour
        ROB_SUCCESS_CHANCE: 0.45,
        MAX_BET: 250000,
        TRANSFER_TAX: 0.05, // 10% tax on transfers
        HOUSE_DISTRIBUTION_INTERVAL: 21600, // 6 hours in seconds
        HOUSE_DISTRIBUTION_MIN_POOL: 1000, // Only distribute if bot has > 1000 coins
        DEFAULT_COOLDOWN: 3,
        MIN_BET: 50,
        GAMBLE_RAID_BASE_CHANCE: 0.005, // 0.5% base chance per bet
        GAMBLE_RAID_PENALTY: 2.5, // 2.5x bet as fine
        JOBS: {
            police: { id: 'police', numericId: 1, bonus: 0.35, color: '#3498db', icon: '👮' },
            criminal: { id: 'criminal', numericId: 2, bonus: 0.40, color: '#e74c3c', icon: '🥷' },
            farmer: { id: 'farmer', numericId: 3, bonus: 0.1, color: '#f1c40f', icon: '👨‍🌾', luck: 1.5 },
            hacker: { id: 'hacker', numericId: 4, bonus: 0.30, color: '#27ae60', icon: '👨‍💻' },
            trader: { id: 'trader', numericId: 5, bonus: 0.45, color: '#f39c12', icon: '📈' },
            teacher: { id: 'teacher', numericId: 6, bonus: 0.25, color: '#95a5a6', icon: '👩‍🏫' }
        },
        LEVELING: {
            XP_MULTIPLIER: 1, // Lowered for slower progression
            MILESTONE_INTERVAL: 20,
            MILESTONE_REWARD_COINS: 50000,
            MILESTONE_REWARD_ITEM_ID: 801 // Common Crate
        },
        LOTTERY: {
            TICKET_PRICE: 10000,
            DRAW_INTERVAL: 86400, // 24 hours
            INITIAL_JACKPOT: 0,
            JACKPOT_PERCENT: 0.9 // 90% price goes to jackpot
        }
    },
    BLACKLISTED_CHANNELS: ['842400189830529035'],
    OWNER_ID: '765577989663883364'
};
