const { checkPrisonGuard, checkPersistentCooldown } = require('../src/utils/guards');
const db = require('../src/database');
const { t } = require('../src/utils/i18n');
const { formatDuration } = require('../src/utils/time');

// Mock dependencies
jest.mock('../src/database');
jest.mock('../src/utils/i18n');
jest.mock('../src/utils/time');
jest.mock('../src/config', () => ({
    PRISON: { BLOCK_EXCEPTIONS: ['help'] },
    ECONOMY: {
        DAILY_COOLDOWN: 86400,
        WORK_COOLDOWN: 3600,
        CRIME_COOLDOWN: 14400,
        ROB_COOLDOWN: 3600,
        FREELANCE_COOLDOWN: 1800,
        BEG_COOLDOWN: 60,
        SEARCH_COOLDOWN: 300,
        ARREST_COOLDOWN: 1800
    },
    COLORS: { INFO: '#0099ff' }
}));

describe('guards.js', () => {
    const userId = '12345';
    const guildId = '67890';
    const lang = 'vi';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkPrisonGuard', () => {
        test('should return inPrison: false if user is not in prison', async () => {
            db.getUser.mockResolvedValue({ id: userId, prison_until: 0 });
            const result = await checkPrisonGuard(userId, guildId, lang);
            expect(result.inPrison).toBe(false);
        });

        test('should return inPrison: true if user is in prison', async () => {
            const futureTime = Math.floor(Date.now() / 1000) + 3600;
            db.getUser.mockResolvedValue({ id: userId, prison_until: futureTime });
            formatDuration.mockReturnValue('1 hour');
            t.mockReturnValue('Bạn đang bị giam! Thời gian còn lại: 1 hour');

            const result = await checkPrisonGuard(userId, guildId, lang);
            expect(result.inPrison).toBe(true);
            expect(result.timeLeft).toBe('1 hour');
            expect(result.msg).toContain('bị giam');
        });

        test('should bypass prison if command is in exceptions', async () => {
            const futureTime = Math.floor(Date.now() / 1000) + 3600;
            db.getUser.mockResolvedValue({ id: userId, prison_until: futureTime });
            const result = await checkPrisonGuard(userId, guildId, lang, 'help');
            expect(result.inPrison).toBe(false);
        });
    });

    describe('checkPersistentCooldown', () => {
        test('should return onCooldown: false if no previous use', async () => {
            db.getUser.mockResolvedValue({ id: userId, last_work: 0 });
            db.getGuildSetting.mockResolvedValue(3600);
            const result = await checkPersistentCooldown(userId, guildId, lang, 'work');
            expect(result.onCooldown).toBe(false);
        });

        test('should return onCooldown: true if within cooldown period', async () => {
            const now = Math.floor(Date.now() / 1000);
            db.getUser.mockResolvedValue({ id: userId, last_work: now - 1000 });
            db.getGuildSetting.mockResolvedValue(3600);
            formatDuration.mockReturnValue('43 minutes');
            t.mockReturnValue('Vui lòng đợi 43 minutes');

            const result = await checkPersistentCooldown(userId, guildId, lang, 'work');
            expect(result.onCooldown).toBe(true);
            expect(result.timeLeft).toBe('43 minutes');
            expect(result.msg).toContain('đợi');
        });

        test('should return onCooldown: false if cooldown expired', async () => {
            const now = Math.floor(Date.now() / 1000);
            db.getUser.mockResolvedValue({ id: userId, last_work: now - 4000 });
            db.getGuildSetting.mockResolvedValue(3600);
            const result = await checkPersistentCooldown(userId, guildId, lang, 'work');
            expect(result.onCooldown).toBe(false);
        });

        test('should correctly identify cooldown for different commands (e.g., daily)', async () => {
            const now = Math.floor(Date.now() / 1000);
            db.getUser.mockResolvedValue({ id: userId, last_daily: now - 1000 });
            db.getGuildSetting.mockResolvedValue(86400);
            formatDuration.mockReturnValue('23 hours');
            t.mockReturnValue('Hồi chiêu: 23 hours');

            const result = await checkPersistentCooldown(userId, guildId, lang, 'daily');
            expect(result.onCooldown).toBe(true);
            expect(result.timeLeft).toBe('23 hours');
        });

        test('should return onCooldown: false for unknown commands', async () => {
            const result = await checkPersistentCooldown(userId, guildId, lang, 'unknown');
            expect(result.onCooldown).toBe(false);
        });
    });
});
