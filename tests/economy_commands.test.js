const work = require('../src/commands/economy/work');
const daily = require('../src/commands/economy/daily');
const db = require('../src/database');
const { calculateReward } = require('../src/utils/multiplier');
const { t, getLanguage } = require('../src/utils/i18n');
const { formatRewardMessage } = require('../src/utils/formatter');

// Mock dependencies
jest.mock('../src/database');
jest.mock('../src/utils/multiplier');
jest.mock('../src/utils/i18n');
jest.mock('../src/utils/formatter');
jest.mock('../src/utils/jobInteractions', () => ({
    handleWorkJobInteractions: jest.fn().mockReturnValue('')
}));
jest.mock('../src/config', () => ({
    ECONOMY: {
        WORK_COOLDOWN: 3600,
        DAILY_COOLDOWN: 86400,
        MIN_WORK_EARNINGS: 50,
        MAX_WORK_EARNINGS: 150,
        DAILY_REWARD: 1000,
        JOBS: {
            police: { id: 'police', bonus: 0.35 },
            criminal: { id: 'criminal', bonus: 0.40 }
        }
    }
}));

describe('Economy Commands', () => {
    let mockMessage;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMessage = {
            author: { id: 'user123', username: 'TestUser' },
            guild: { id: 'guild123' },
            member: { roles: { cache: new Map() } },
            reply: jest.fn().mockResolvedValue(null),
            client: {
                user: { id: 'bot123' },
                cooldowns: new Map()
            }
        };
        getLanguage.mockResolvedValue('vi');
    });

    describe('daily command', () => {
        test('should execute daily successfully', async () => {
            db.getUser.mockResolvedValue({ id: 'user123', last_daily: 0, daily_streak: 0 });
            db.getGuildSetting.mockResolvedValue(1000); // base reward
            calculateReward.mockResolvedValue({
                total: 1200,
                bonus: 200,
                percent: 20,
                cap: 50,
                capReached: false
            });
            formatRewardMessage.mockReturnValue('Daily success message');

            await daily.execute(mockMessage, []);

            expect(db.addBalance).toHaveBeenCalledWith('guild123', 'user123', 1200);
            expect(db.updateUser).toHaveBeenCalledWith('guild123', 'user123', expect.objectContaining({ last_daily: expect.any(Number) }));
            expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Daily success message'));
        });
    });

    describe('work command', () => {
        test('should execute work successfully', async () => {
            db.getUser.mockResolvedValue({ id: 'user123', level: 5, job: null });
            db.getGuildSetting.mockImplementation((guildId, key, def) => {
                if (key === 'work_min') return 100;
                if (key === 'work_max') return 200;
                return def;
            });
            t.mockImplementation((key) => {
                if (key === 'work.job_categories') return { tier5: ['Worker'] };
                return key;
            });
            calculateReward.mockResolvedValue({
                total: 150,
                bonus: 30,
                percent: 25,
                cap: 50,
                capReached: false
            });
            formatRewardMessage.mockReturnValue('Work success message');

            await work.execute(mockMessage, []);

            expect(db.addBalance).toHaveBeenCalledWith('guild123', 'user123', 150);
            expect(db.updateUser).toHaveBeenCalledWith('guild123', 'user123', expect.objectContaining({ last_work: expect.any(Number) }));
            expect(mockMessage.reply).toHaveBeenCalled();
        });
    });
});
