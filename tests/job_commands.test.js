const arrest = require('../src/commands/economy/arrest');
const mentor = require('../src/commands/social/mentor');
const market = require('../src/commands/shop/market');
const harvest = require('../src/commands/economy/harvest');
const hack = require('../src/commands/economy/hack');

const db = require('../src/database');
const { t, getLanguage } = require('../src/utils/i18n');
const { formatDuration } = require('../src/utils/time');
const { deductXp, addXp } = require('../src/utils/leveling');

// Mock dependencies
jest.mock('../src/database');
jest.mock('../src/utils/i18n');
jest.mock('../src/utils/time');
jest.mock('../src/utils/leveling');
jest.mock('../src/utils/economy', () => ({
    addHouseProfit: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/config', () => ({
    COLORS: { SUCCESS: '#00ff00' },
    EMOJIS: { COIN: '💰' },
    PRISON: { BASE_TIME: 3600, STARS_MULTIPLIER: 7200 },
    ECONOMY: {
        ARREST_COOLDOWN: 1200,
        ARREST_INJURY_COOLDOWN: 7200,
        ARREST_RESISTANCE_BASE: 0.25
    }
}));

describe('Job Specific Commands', () => {
    let mockMessage;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMessage = {
            author: { id: 'police123', username: 'PoliceOfficer' },
            guild: { id: 'guild123' },
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
        t.mockImplementation((key) => key);
    });

    describe('arrest command', () => {
        test('should arrest successfully', async () => {
            const target = { id: 'thief456', username: 'WantedCriminal' };
            mockMessage.mentions.users.set(target.id, target);
            mockMessage.mentions.users.first = () => target;

            db.getUser.mockImplementation((id) => {
                if (id === 'police123') return { id: 'police123', job: 'police', level: 10 };
                if (id === 'thief456') return { id: 'thief456', bounty: 1000, wanted_level: 2, balance: 5000 };
            });

            deductXp.mockResolvedValue({ deducted: 200 });
            Math.random = jest.fn().mockReturnValue(0.1); // Force success

            await arrest.execute(mockMessage, []);

            expect(db.addBalance).toHaveBeenCalledWith('guild123', 'police123', 1000);
            expect(db.removeBalance).toHaveBeenCalledWith('guild123', 'thief456', 500); // 10% of 5000
            expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET prison_until'), expect.any(Array));
            expect(mockMessage.reply).toHaveBeenCalled();
        });
    });

    describe('mentor command', () => {
        test('should grant XP boost if teacher', async () => {
            const target = { id: 'student789', username: 'StudentUser' };
            mockMessage.mentions.users.set(target.id, target);
            mockMessage.mentions.users.first = () => target;

            db.getUser.mockImplementation((id) => {
                if (id === 'police123') return { id: 'police123', job: 'teacher' };
                if (id === 'student789') return { id: 'student789', active_buffs: '[]' };
            });

            await mentor.execute(mockMessage, []);

            expect(db.updateUser).toHaveBeenCalledWith('guild123', 'student789', expect.objectContaining({ active_buffs: expect.stringContaining('612') }));
            expect(addXp).toHaveBeenCalledWith('police123', 'guild123', 100);
        });
    });

    describe('market command', () => {
        test('should give discount if trader', async () => {
            db.getUser.mockResolvedValue({ id: 'police123', job: 'trader', active_buffs: '[]' });

            await market.execute(mockMessage, ['deal']);

            expect(db.updateUser).toHaveBeenCalledWith('guild123', 'police123', expect.objectContaining({ active_buffs: expect.stringContaining('611') }));
        });
    });

    describe('harvest command', () => {
        test('should harvest coins if farmer', async () => {
            db.getUser.mockResolvedValue({ id: 'police123', job: 'farmer', level: 5 });
            Math.random = jest.fn().mockReturnValue(0.9); // Force coins

            await harvest.execute(mockMessage, []);

            expect(db.addBalance).toHaveBeenCalledWith('guild123', 'police123', expect.any(Number));
        });
    });

    describe('hack command', () => {
        test('should hack coins if hacker', async () => {
            db.getUser.mockResolvedValue({ id: 'police123', job: 'hacker', level: 5 });
            Math.random = jest.fn().mockReturnValue(0.1); // Force success

            await hack.execute(mockMessage, ['coins']);

            expect(db.addBalance).toHaveBeenCalledWith('guild123', 'police123', expect.any(Number));
        });
    });
});
