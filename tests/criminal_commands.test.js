const crime = require('../src/commands/economy/crime');
const rob = require('../src/commands/economy/rob');
const db = require('../src/database');
const { calculateReward } = require('../src/utils/multiplier');
const { t, getLanguage } = require('../src/utils/i18n');
const { deductXp } = require('../src/utils/leveling');

// Mock dependencies
jest.mock('../src/database');
jest.mock('../src/utils/multiplier');
jest.mock('../src/utils/i18n');
jest.mock('../src/utils/leveling');
jest.mock('../src/utils/economy', () => ({
    addHouseProfit: jest.fn().mockResolvedValue(true)
}));
jest.mock('../src/utils/formatter', () => ({
    formatRewardMessage: jest.fn().mockReturnValue('Success message')
}));
jest.mock('../src/utils/jobInteractions', () => ({
    handleCrimeJobInteractions: jest.fn().mockReturnValue('')
}));

jest.mock('../src/config', () => ({
    ECONOMY: {
        CRIME_COOLDOWN: 3600,
        ROB_COOLDOWN: 3600,
        CRIME_SUCCESS_RATE: 0.5,
        ROB_SUCCESS_CHANCE: 0.5,
        CRIME_MIN_REWARD: 1000,
        CRIME_MAX_REWARD: 2000
    },
    WANTED: {
        DURATIONS: { 1: 3600, 2: 7200, 3: 21600, 4: 43200, 5: 86400 },
        BOUNTY_THRESHOLDS: [{ stars: 1, min: 0 }]
    },
    COLORS: { SUCCESS: '#00ff00' },
    OWNER_ID: 'owner123'
}));

describe('Criminal Commands', () => {
    let mockMessage;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMessage = {
            author: { id: 'thief123', username: 'ThiefUser' },
            guild: { id: 'guild123' },
            member: { roles: { cache: new Map() } },
            mentions: { users: new Map() },
            reply: jest.fn().mockResolvedValue(null),
            client: {
                user: { id: 'bot123' },
                cooldowns: {
                    get: jest.fn().mockReturnValue(new Map())
                }
            }
        };
        getLanguage.mockResolvedValue('vi');
        t.mockImplementation((key) => key === 'crime.actions' ? ['robbed a bank'] : key);
    });

    describe('crime command', () => {
        test('should execute crime successfully', async () => {
            db.getUser.mockResolvedValue({ id: 'thief123', job: 'criminal', wanted_level: 0 });
            db.getGuildSetting.mockResolvedValue(0.5); // rate
            calculateReward.mockResolvedValue({ total: 1000, bonus: 200, percent: 20 });
            Math.random = jest.fn().mockReturnValue(0.1); // Force success

            await crime.execute(mockMessage, []);

            expect(db.addBalance).toHaveBeenCalledWith('guild123', 'thief123', 1000);
            expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET bounty = bounty + ?'), expect.any(Array));
            expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Success message'));
        });

        test('should fail and send to prison', async () => {
            db.getUser.mockResolvedValue({ id: 'thief123', job: 'criminal', balance: 1000, level: 1 });
            db.getGuildSetting.mockResolvedValue(0.5);
            deductXp.mockResolvedValue({ deducted: 50 });
            db.getRandomUserByJob.mockResolvedValue(null);
            Math.random = jest.fn().mockReturnValue(0.9); // Force failure

            await crime.execute(mockMessage, []);

            expect(db.updateUser).toHaveBeenCalledWith('guild123', 'thief123', expect.objectContaining({ prison_until: expect.any(Number) }));
            expect(mockMessage.reply).toHaveBeenCalled();
        });
    });

    describe('rob command', () => {
        test('should rob successfully', async () => {
            const target = { id: 'victim456', username: 'VictimUser' };
            mockMessage.mentions.users.set(target.id, target);
            mockMessage.mentions.users.first = () => target;

            db.getUser.mockImplementation((id) => {
                if (id === 'thief123') return { id: 'thief123', balance: 500, wanted_level: 0 };
                if (id === 'victim456') return { id: 'victim456', balance: 10000, prison_until: 0 };
            });

            calculateReward.mockResolvedValue({ total: 500, bonus: 0, percent: 0 });
            Math.random = jest.fn().mockReturnValue(0.1); // Force success

            // Mock isProtectedFromRob
            require('../src/utils/multiplier').isProtectedFromRob = jest.fn().mockResolvedValue(false);

            await rob.execute(mockMessage, []);

            expect(db.addBalance).toHaveBeenCalledWith('guild123', 'thief123', 500);
            expect(db.removeBalance).toHaveBeenCalledWith('guild123', 'victim456', expect.any(Number));
            expect(mockMessage.reply).toHaveBeenCalled();
        });
    });
});
