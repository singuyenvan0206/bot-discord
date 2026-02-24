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
        FISH_COOLDOWN: 15,
        SELL_RECOVERY: 0.7, // 70% return
        MIN_WORK_EARNINGS: 100,
        MAX_WORK_EARNINGS: 300,
        CRIME_COOLDOWN: 3600, // 4 hours
        CRIME_SUCCESS_RATE: 0.4,
        CRIME_MIN_REWARD: 1000,
        CRIME_MAX_REWARD: 3000,
        CRIME_FINE_PERCENT: 0.1, // Pay 10% of balance as fine
        SLUT_COOLDOWN: 7200, // 2 hours
        SLUT_SUCCESS_RATE: 0.6,
        SLUT_MIN_REWARD: 400,
        SLUT_MAX_REWARD: 1000,
        SLUT_FAIL_PENALTY: 200, // Fixed fine
        BEG_COOLDOWN: 300, // 5 minutes
        BEG_SUCCESS_RATE: 0.4,
        BEG_MIN_REWARD: 10,
        BEG_MAX_REWARD: 50,
        SEARCH_COOLDOWN: 600, // 10 minutes
        SEARCH_MIN_REWARD: 50,
        SEARCH_MAX_REWARD: 200,
        ROB_COOLDOWN: 3600, // 1 hour
        ROB_SUCCESS_CHANCE: 0.5,
        ROB_FAIL_PENALTY_PERCENT: 0.1, // Loser pays 10% to victim
        MAX_BET: 250000,
        HOUSE_DISTRIBUTION_INTERVAL: 21600, // 6 hours in seconds
        HOUSE_DISTRIBUTION_MIN_POOL: 1000, // Only distribute if bot has > 1000 coins
        DEFAULT_COOLDOWN: 3,
        JOBS: {
            police: { id: 'police', bonus: 0.10, color: '#3498db', icon: '👮' },
            criminal: { id: 'criminal', bonus: 0.15, color: '#e74c3c', icon: '🥷' },
            doctor: { id: 'doctor', bonus: 0.05, color: '#2ecc71', icon: '👨‍⚕️' },
            programmer: { id: 'programmer', bonus: 0.20, color: '#9b59b6', icon: '💻' },
            farmer: { id: 'farmer', bonus: 0.10, color: '#f1c40f', icon: '👨‍🌾' },
            hacker: { id: 'hacker', bonus: 0.25, color: '#27ae60', icon: '👨‍💻' },
            streamer: { id: 'streamer', bonus: 0.12, color: '#6441a5', icon: '🎥' },
            chef: { id: 'chef', bonus: 0.12, color: '#e67e22', icon: '👨‍🍳' },
            musician: { id: 'musician', bonus: 0.10, color: '#1abc9c', icon: '🎸' },
            soldier: { id: 'soldier', bonus: 0.10, color: '#95a5a6', icon: '🪖' },
            trader: { id: 'trader', bonus: 0.15, color: '#f39c12', icon: '📈' },
            teacher: { id: 'teacher', bonus: 0.08, color: '#3498db', icon: '📚' }
        },
        LEVELING: {
            XP_MULTIPLIER: 3.0 // Triple the XP gain for faster progression
        }
    },
    BLACKLISTED_CHANNELS: ['842400189830529035'] 
};
