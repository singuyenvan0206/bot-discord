const { execute, queryAll, queryOne } = require('./pool');
const { getGuildSetting, setGuildSetting } = require('./guilds');

// ─── Lottery ───────────────────────────────────────────────

async function addLotteryTicket(guildId, userId, count = 1) {
    guildId = guildId || 'global';
    await execute('INSERT INTO lottery_tickets (guild_id, user_id, count) VALUES (?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET count = lottery_tickets.count + EXCLUDED.count', [guildId, userId, count]);
}

async function getLotteryTickets(guildId) {
    guildId = guildId || 'global';
    return await queryAll('SELECT * FROM lottery_tickets WHERE guild_id = ?', [guildId]);
}

async function clearLotteryTickets(guildId) {
    guildId = guildId || 'global';
    await execute('DELETE FROM lottery_tickets WHERE guild_id = ?', [guildId]);
}

async function getLotteryJackpot(guildId) {
    const val = guildId ? await getGuildSetting(guildId, 'lottery_jackpot') : await getGlobalSetting('lottery_jackpot');
    if (!val) {
        const config = require('../config');
        if (guildId) await setGuildSetting(guildId, 'lottery_jackpot', config.ECONOMY.LOTTERY.INITIAL_JACKPOT);
        else await setGlobalSetting('lottery_jackpot', config.ECONOMY.LOTTERY.INITIAL_JACKPOT.toString());
        return config.ECONOMY.LOTTERY.INITIAL_JACKPOT;
    }
    return parseInt(val);
}

async function addLotteryJackpot(guildId, amount) {
    const current = await getLotteryJackpot(guildId);
    if (!guildId) await setGlobalSetting('lottery_jackpot', (current + amount).toString());
    else await setGuildSetting(guildId, 'lottery_jackpot', (current + amount));
}

async function setLotteryJackpot(guildId, amount) {
    if (!guildId) await setGlobalSetting('lottery_jackpot', amount.toString());
    else await setGuildSetting(guildId, 'lottery_jackpot', amount);
}

// ─── Businesses ──────────────────────────────────────────────

async function getUserBusinesses(userId) {
    return await queryAll('SELECT * FROM user_businesses WHERE user_id = ?', [userId]);
}

async function addUserBusiness(userId, businessId) {
    await execute('INSERT INTO user_businesses (user_id, business_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [userId, businessId]);
}

async function updateUserBusiness(userId, businessId, updates) {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
    });
    if (fields.length === 0) return;
    values.push(userId, businessId);
    await execute(`UPDATE user_businesses SET ${fields.join(', ')} WHERE user_id = ? AND business_id = ?`, values);
}

async function getAllUserBusinesses() {
    return await queryAll('SELECT * FROM user_businesses');
}

async function removeAllUserBusinesses(userId) {
    await execute('DELETE FROM user_businesses WHERE user_id = ?', [userId]);
}

async function transferUserBusiness(fromUserId, toUserId, businessId) {
    await execute('UPDATE user_businesses SET user_id = ? WHERE user_id = ? AND business_id = ?', [toUserId, fromUserId, businessId]);
}

// ─── Global Settings (Moved here or to guilds.js) ───

async function getGlobalSetting(key, defaultValue = null) {
    const row = await queryOne('SELECT value FROM global_settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
}

async function setGlobalSetting(key, value) {
    await execute(`
        INSERT INTO global_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `, [key, value]);
}

module.exports = {
    addLotteryTicket,
    getLotteryTickets,
    clearLotteryTickets,
    getLotteryJackpot,
    addLotteryJackpot,
    setLotteryJackpot,
    getUserBusinesses,
    addUserBusiness,
    updateUserBusiness,
    getAllUserBusinesses,
    removeAllUserBusinesses,
    transferUserBusiness,
    getGlobalSetting,
    setGlobalSetting
};
