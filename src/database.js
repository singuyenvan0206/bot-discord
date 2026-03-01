const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Postgres Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle Postgres client', err);
});

let dbInitialized = false;

async function getDb() {
    if (!dbInitialized) {
        await initSchema();
        dbInitialized = true;
    }
    return pool;
}

// Dummy saveDb to prevent errors from old automated saves
async function saveDb() {
    return true;
}

// ─── SQL Wrappers (Auto translate ? to $1, $2, etc.) ─────────
async function execute(sql, params = []) {
    let pgSql = sql;
    let i = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${i++}`);
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    await pool.query(pgSql, sanitizedParams);
}

async function queryAll(sql, params = []) {
    let pgSql = sql;
    let i = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${i++}`);
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    const { rows } = await pool.query(pgSql, sanitizedParams);
    return rows;
}

async function queryOne(sql, params = []) {
    const rows = await queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

async function safeAddColumn(table, column, definition) {
    try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch {
        // Column already exists
    }
}

async function initSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS giveaways (
            id SERIAL PRIMARY KEY,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT UNIQUE,
            host_id TEXT NOT NULL,
            prize TEXT NOT NULL,
            description TEXT,
            winner_count INTEGER NOT NULL DEFAULT 1,
            required_role_id TEXT,
            ends_at BIGINT NOT NULL,
            ended INTEGER NOT NULL DEFAULT 0,
            paused INTEGER NOT NULL DEFAULT 0,
            scheduled_start BIGINT,
            created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()))
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS participants (
            id SERIAL PRIMARY KEY,
            giveaway_id INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL,
            bonus_entries INTEGER NOT NULL DEFAULT 0,
            UNIQUE(giveaway_id, user_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            balance BIGINT NOT NULL DEFAULT 0,
            xp BIGINT NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 0,
            last_daily BIGINT DEFAULT 0,
            last_work BIGINT DEFAULT 0,
            last_rob BIGINT DEFAULT 0,
            last_crime BIGINT DEFAULT 0,
            last_slut BIGINT DEFAULT 0,
            last_beg BIGINT DEFAULT 0,
            last_search BIGINT DEFAULT 0,
            job TEXT DEFAULT NULL,
            inventory TEXT DEFAULT '{}',
            active_buffs TEXT DEFAULT '[]',
            purchased_roles TEXT DEFAULT '[]',
            warnings INTEGER DEFAULT 0,
            language TEXT DEFAULT NULL,
            server_data TEXT DEFAULT '{}',
            last_dist_amount BIGINT DEFAULT 0
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_guilds (
            userId TEXT NOT NULL,
            guildId TEXT NOT NULL,
            PRIMARY KEY (userId, guildId),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS guilds (
            id TEXT PRIMARY KEY,
            language TEXT DEFAULT 'vi',
            prefix TEXT,
            dist_channel TEXT,
            json_data TEXT DEFAULT '{}'
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS global_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS guild_roles (
            guild_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price BIGINT NOT NULL,
            income_buff REAL DEFAULT 0,
            xp_buff REAL DEFAULT 0,
            color TEXT,
            PRIMARY KEY (guild_id, role_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            PRIMARY KEY (guild_id, key)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS marriages (
            guild_id TEXT NOT NULL,
            user1_id TEXT NOT NULL,
            user2_id TEXT NOT NULL,
            ring_id INTEGER DEFAULT 701,
            created_at BIGINT NOT NULL DEFAULT (extract(epoch from now())),
            PRIMARY KEY (guild_id, user1_id, user2_id),
            UNIQUE(guild_id, user1_id),
            UNIQUE(guild_id, user2_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS lottery_tickets (
            guild_id TEXT NOT NULL DEFAULT 'global',
            user_id TEXT NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (guild_id, user_id)
        )
    `);

    // Indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_giveaways_message ON giveaways(message_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_giveaways_active ON giveaways(ended, ends_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_participants_giveaway ON participants(giveaway_id)');

    console.log('✅ PostgreSQL Schema initialized.');
}

// ─── Giveaway CRUD ───────────────────────────────────────────────

async function createGiveaway({ guildId, channelId, messageId, hostId, prize, description, winnerCount, requiredRoleId, endsAt, scheduledStart }) {
    const res = await pool.query(
        `INSERT INTO giveaways (guild_id, channel_id, message_id, host_id, prize, description, winner_count, required_role_id, ends_at, scheduled_start)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [guildId, channelId, messageId, hostId, prize, description || null, winnerCount, requiredRoleId || null, endsAt, scheduledStart || null]
    );
    return res.rows[0].id;
}

async function getGiveaway(messageId) {
    return await queryOne('SELECT * FROM giveaways WHERE message_id = ?', [messageId]);
}

async function getGiveawayById(id) {
    return await queryOne('SELECT * FROM giveaways WHERE id = ?', [id]);
}

async function getActiveGiveaways(guildId) {
    const now = Math.floor(Date.now() / 1000);
    if (guildId) {
        return await queryAll('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 AND (scheduled_start IS NULL OR scheduled_start <= ?) ORDER BY ends_at ASC', [guildId, now]);
    }
    return await queryAll('SELECT * FROM giveaways WHERE ended = 0 AND (scheduled_start IS NULL OR scheduled_start <= ?) ORDER BY ends_at ASC', [now]);
}

async function getExpiredGiveaways() {
    const now = Math.floor(Date.now() / 1000);
    return await queryAll('SELECT * FROM giveaways WHERE ended = 0 AND paused = 0 AND ends_at <= ? AND (scheduled_start IS NULL OR scheduled_start <= ?)', [now, now]);
}

async function getScheduledGiveaways() {
    const now = Math.floor(Date.now() / 1000);
    return await queryAll('SELECT * FROM giveaways WHERE ended = 0 AND scheduled_start IS NOT NULL AND scheduled_start <= ? AND message_id IS NULL', [now]);
}

async function endGiveaway(messageId) {
    await execute('UPDATE giveaways SET ended = 1 WHERE message_id = ?', [messageId]);
}

async function pauseGiveaway(messageId) {
    await execute('UPDATE giveaways SET paused = 1 WHERE message_id = ?', [messageId]);
}

async function resumeGiveaway(messageId) {
    await execute('UPDATE giveaways SET paused = 0 WHERE message_id = ?', [messageId]);
}

async function updateGiveaway(messageId, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    if (updates.prize !== undefined) { fields.push(`prize = $${i++}`); values.push(updates.prize); }
    if (updates.description !== undefined) { fields.push(`description = $${i++}`); values.push(updates.description); }
    if (updates.winnerCount !== undefined) { fields.push(`winner_count = $${i++}`); values.push(updates.winnerCount); }
    if (updates.endsAt !== undefined) { fields.push(`ends_at = $${i++}`); values.push(updates.endsAt); }
    if (updates.scheduledStart !== undefined) { fields.push(`scheduled_start = $${i++}`); values.push(updates.scheduledStart); }
    if (updates.paused !== undefined) { fields.push(`paused = $${i++}`); values.push(updates.paused ? 1 : 0); }
    if (fields.length === 0) return;
    values.push(messageId);
    await pool.query(`UPDATE giveaways SET ${fields.join(', ')} WHERE message_id = $${i}`, values);
}

async function deleteGiveaway(messageId) {
    await execute('DELETE FROM giveaways WHERE message_id = ?', [messageId]);
}

// ─── Participants ────────────────────────────────────────────────

async function addParticipant(giveawayId, userId) {
    try {
        await execute('INSERT INTO participants (giveaway_id, user_id) VALUES (?, ?) ON CONFLICT(giveaway_id, user_id) DO NOTHING', [giveawayId, userId]);
    } catch (e) { }
}

async function removeParticipant(giveawayId, userId) {
    await execute('DELETE FROM participants WHERE giveaway_id = ? AND user_id = ?', [giveawayId, userId]);
}

async function getParticipants(giveawayId) {
    return await queryAll('SELECT user_id, bonus_entries FROM participants WHERE giveaway_id = ?', [giveawayId]);
}

async function getParticipantUserIds(giveawayId) {
    const rows = await queryAll('SELECT user_id FROM participants WHERE giveaway_id = ?', [giveawayId]);
    return rows.map(r => r.user_id);
}

async function getParticipantCount(giveawayId) {
    const row = await queryOne('SELECT COUNT(*) as count FROM participants WHERE giveaway_id = ?', [giveawayId]);
    return row ? Number(row.count) : 0;
}

async function getTotalEntries(giveawayId) {
    const row = await queryOne('SELECT COUNT(*) + COALESCE(SUM(bonus_entries), 0) as total FROM participants WHERE giveaway_id = ?', [giveawayId]);
    return row ? Number(row.total) : 0;
}

async function addBonusEntry(giveawayId, userId, count = 1) {
    await execute('INSERT INTO participants (giveaway_id, user_id) VALUES (?, ?) ON CONFLICT(giveaway_id, user_id) DO NOTHING', [giveawayId, userId]);
    await execute('UPDATE participants SET bonus_entries = bonus_entries + ? WHERE giveaway_id = ? AND user_id = ?', [count, giveawayId, userId]);
}

async function getBonusEntries(giveawayId, userId) {
    const row = await queryOne('SELECT bonus_entries FROM participants WHERE giveaway_id = ? AND user_id = ?', [giveawayId, userId]);
    return row ? row.bonus_entries : 0;
}

// ─── Global Scope: User / Economy ──────────────────────────────────────────────

async function getUser(userId, guildId = null) {
    let user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
        await execute('INSERT INTO users (id) VALUES (?) ON CONFLICT DO NOTHING', [userId]);
        user = { id: userId, balance: 0, xp: 0, level: 0, last_daily: 0, last_work: 0, last_rob: 0, last_crime: 0, last_slut: 0, last_beg: 0, last_search: 0, last_dist_amount: 0, job: null, inventory: '{}', active_buffs: '[]', purchased_roles: '[]', language: null };
    }

    if (guildId) {
        await execute('INSERT INTO user_guilds (userId, guildId) VALUES (?, ?) ON CONFLICT DO NOTHING', [userId, guildId]);
    }

    // Force numeric conversions because Postgres driver returns BIGINT as String
    user.balance = Number(user.balance);
    user.xp = Number(user.xp);

    return user;
}

async function getGlobalUser(userId) {
    return await getUser(userId);
}

async function updateUser(guildIdOrUserId, userIdOrUpdates, updatesOnly) {
    let userId, updates;
    if (typeof userIdOrUpdates === 'object') {
        userId = guildIdOrUserId;
        updates = userIdOrUpdates;
    } else {
        userId = userIdOrUpdates;
        updates = updatesOnly;
    }
    return await updateGlobalUser(userId, updates);
}

async function updateGlobalUser(userId, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${i++}`);
        values.push(value);
    });
    if (fields.length === 0) return;
    values.push(userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
}

async function addBalance(guildIdOrUserId, userIdOrAmount, amountOnly) {
    let userId, amount;
    if (typeof userIdOrAmount === 'number') {
        userId = guildIdOrUserId;
        amount = userIdOrAmount;
    } else {
        userId = userIdOrAmount;
        amount = amountOnly;
    }
    return await addGlobalBalance(userId, amount);
}

async function addGlobalBalance(userId, amount) {
    await execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
}

async function removeBalance(guildIdOrUserId, userIdOrAmount, amountOnly) {
    let userId, amount;
    if (typeof userIdOrAmount === 'number') {
        userId = guildIdOrUserId;
        amount = userIdOrAmount;
    } else {
        userId = userIdOrAmount;
        amount = amountOnly;
    }
    return await removeGlobalBalance(userId, amount);
}

async function removeGlobalBalance(userId, amount) {
    await execute('UPDATE users SET balance = GREATEST(0, balance - ?) WHERE id = ?', [amount, userId]);
}

async function getTopUsers(guildId, limit = 100, type = 'balance', filter = null) {
    const allowedColumns = ['balance', 'xp', 'level'];
    if (!allowedColumns.includes(type)) type = 'balance';

    let results = [];
    const queryBase = `
        SELECT users.* 
        FROM users 
        JOIN user_guilds ON users.id = user_guilds.userId 
        WHERE user_guilds.guildId = $1
    `;

    if (filter && filter.column && filter.value !== undefined) {
        const { rows } = await pool.query(
            `${queryBase} AND users.${filter.column} = $2 ORDER BY users.${type} DESC LIMIT $3`,
            [guildId, filter.value, limit]
        );
        results = rows;
    } else {
        const { rows } = await pool.query(
            `${queryBase} ORDER BY users.${type} DESC LIMIT $2`,
            [guildId, limit]
        );
        results = rows;
    }

    return results.map(u => ({ ...u, balance: Number(u.balance), xp: Number(u.xp) }));
}

async function addItem(guildIdOrUserId, userIdOrItemId, itemIdOrCount, countOnly = 1) {
    let userId, itemId, count;
    if (arguments.length >= 4 || (arguments.length >= 3 && typeof itemIdOrCount === 'number')) {
        userId = userIdOrItemId;
        itemId = itemIdOrCount;
        count = countOnly;
    } else {
        userId = guildIdOrUserId;
        itemId = userIdOrItemId;
        count = itemIdOrCount || 1;
    }
    return await addGlobalItem(userId, itemId, count);
}

async function addGlobalItem(userId, itemId, count = 1) {
    const user = await getGlobalUser(userId);
    const inv = JSON.parse(user.inventory || '{}');
    inv[itemId] = (inv[itemId] || 0) + count;
    await execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
}

async function removeItem(guildIdOrUserId, userIdOrItemId, itemIdOrCount, countOnly = 1) {
    let userId, itemId, count;
    if (arguments.length >= 4 || (arguments.length >= 3 && typeof itemIdOrCount === 'number')) {
        userId = userIdOrItemId;
        itemId = itemIdOrCount;
        count = countOnly;
    } else {
        userId = guildIdOrUserId;
        itemId = userIdOrItemId;
        count = itemIdOrCount || 1;
    }
    return await removeGlobalItem(userId, itemId, count);
}

async function removeGlobalItem(userId, itemId, count = 1) {
    const user = await getGlobalUser(userId);
    const inv = JSON.parse(user.inventory || '{}');
    if (!inv[itemId]) return false;

    inv[itemId] -= count;
    if (inv[itemId] <= 0) delete inv[itemId];

    await execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
    return true;
}

async function getGuildUser(guildId, userId) {
    return await getGlobalUser(userId);
}

async function updateGuildUser(guildId, userId, updates) {
    return await updateGlobalUser(userId, updates);
}

async function isOwner(userId) {
    return process.env.OWNER_ID === userId;
}

async function getGuild(guildId) {
    let guild = await queryOne('SELECT * FROM guilds WHERE id = ?', [guildId]);
    if (!guild) {
        await execute('INSERT INTO guilds (id) VALUES (?) ON CONFLICT DO NOTHING', [guildId]);
        guild = { id: guildId, language: 'vi', prefix: null, json_data: '{}' };
    }
    return guild;
}

async function updateGuild(guildId, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${i++}`);
        values.push(value);
    });
    if (fields.length === 0) return;
    values.push(guildId);
    await pool.query(`UPDATE guilds SET ${fields.join(', ')} WHERE id = $${i}`, values);
}

async function getRandomUserByJob(jobId, excludeIds = []) {
    let query = 'SELECT id FROM users WHERE job = $1';
    const params = [jobId];
    if (excludeIds.length > 0) {
        let i = 2;
        const placeholders = excludeIds.map(() => `$${i++}`).join(', ');
        query += ` AND id NOT IN (${placeholders})`;
        params.push(...excludeIds);
    }
    const { rows } = await pool.query(query, params);
    if (!rows || rows.length === 0) return null;
    return rows[Math.floor(Math.random() * rows.length)].id;
}

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

async function getUserCount() {
    const row = await queryOne('SELECT COUNT(*) as count FROM users');
    return row ? Number(row.count) : 0;
}

async function distributeBalanceToAll(amount, excludeUserId = null) {
    if (excludeUserId) {
        await execute('UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id != ?', [amount, excludeUserId]);
        await execute('UPDATE users SET balance = 0 WHERE id = ?', [excludeUserId]);
    } else {
        await execute('UPDATE users SET balance = COALESCE(balance, 0) + ?', [amount]);
    }
}

async function distributeBalanceRandomly(totalAmount, excludeUserId = null) {
    let users = await queryAll('SELECT id FROM users' + (excludeUserId ? ' WHERE id != ?' : ''), excludeUserId ? [excludeUserId] : []);

    if (users.length === 0) return [];

    let weights = users.map(() => Math.random());
    let totalWeight = weights.reduce((a, b) => a + b, 0);

    let distributed = 0;
    const results = [];

    await execute('UPDATE users SET last_dist_amount = 0' + (excludeUserId ? ' WHERE id != ?' : ''), excludeUserId ? [excludeUserId] : []);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        let amount = 0;
        if (i === users.length - 1) {
            amount = totalAmount - distributed;
        } else {
            amount = Math.floor((weights[i] / totalWeight) * totalAmount);
            distributed += amount;
        }

        if (amount > 0) {
            await execute('UPDATE users SET balance = balance + ?, last_dist_amount = ? WHERE id = ?', [amount, amount, user.id]);
            results.push({ userId: user.id, amount });
        }
    }

    if (excludeUserId) {
        await execute('UPDATE users SET balance = 0, last_dist_amount = 0 WHERE id = ?', [excludeUserId]);
    }

    return results;
}

async function clearAllData() {
    await execute('TRUNCATE TABLE users CASCADE');
    await execute('TRUNCATE TABLE giveaways CASCADE');
    await execute('TRUNCATE TABLE participants CASCADE');
    await execute('TRUNCATE TABLE guilds CASCADE');
    await execute('TRUNCATE TABLE global_settings CASCADE');
    await execute('TRUNCATE TABLE marriages CASCADE');
}

async function resetUser(userId) {
    await execute('DELETE FROM users WHERE id = ?', [userId]);
    await execute('DELETE FROM participants WHERE user_id = ?', [userId]);
    await execute('DELETE FROM lottery_tickets WHERE user_id = ?', [userId]);
    await execute('DELETE FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
}

async function getMarriage(guildId, userId) {
    if (!guildId) return await queryOne('SELECT * FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
    return await queryOne('SELECT * FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)', [guildId, userId, userId]);
}

async function createMarriage(guildId, user1Id, user2Id, ringId = 701) {
    const [u1, u2] = [user1Id, user2Id].sort();
    if (!guildId) {
        await execute('INSERT INTO marriages (user1_id, user2_id, ring_id) VALUES (?, ?, ?)', [u1, u2, ringId]);
        return;
    }
    await execute('INSERT INTO marriages (guild_id, user1_id, user2_id, ring_id) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', [guildId, u1, u2, ringId]);
}

async function deleteMarriage(guildId, userId) {
    if (!guildId) {
        await execute('DELETE FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
        return;
    }
    await execute('DELETE FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)', [guildId, userId, userId]);
}

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
        const config = require('./config');
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

async function addGuildRole(guildId, roleId, name, price, incomeBuff, xpBuff, color) {
    await execute(`
        INSERT INTO guild_roles (guild_id, role_id, name, price, income_buff, xp_buff, color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, role_id) DO UPDATE SET
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            income_buff = EXCLUDED.income_buff,
            xp_buff = EXCLUDED.xp_buff,
            color = EXCLUDED.color
    `, [guildId, roleId, name, price, incomeBuff, xpBuff, color]);
}

async function removeGuildRole(guildId, roleId) {
    await execute('DELETE FROM guild_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
}

async function getGuildRoles(guildId) {
    return await queryAll('SELECT * FROM guild_roles WHERE guild_id = ? ORDER BY price ASC', [guildId]);
}

async function getGuildRole(guildId, roleId) {
    return await queryOne('SELECT * FROM guild_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
}

async function getGuildSetting(guildId, key, defaultValue = null) {
    const row = await queryOne('SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?', [guildId, key]);
    if (row) {
        const val = row.value;
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (!isNaN(val) && val.trim() !== '') return Number(val);
        return val;
    }
    return defaultValue;
}

async function setGuildSetting(guildId, key, value) {
    await execute(`
        INSERT INTO guild_settings (guild_id, key, value)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, key) DO UPDATE SET value = EXCLUDED.value
    `, [guildId, key, String(value)]);
}

module.exports = {
    getDb,
    saveDb,
    createGiveaway,
    getGiveaway,
    getGiveawayById,
    getActiveGiveaways,
    getExpiredGiveaways,
    getScheduledGiveaways,
    endGiveaway,
    pauseGiveaway,
    resumeGiveaway,
    updateGiveaway,
    deleteGiveaway,
    addParticipant,
    removeParticipant,
    getParticipants,
    getParticipantUserIds,
    getParticipantCount,
    getTotalEntries,
    addBonusEntry,
    getBonusEntries,
    getUser,
    updateUser,
    addBalance,
    removeBalance,
    getTopUsers,
    addItem,
    removeItem,
    getRandomUserByJob,
    getGuildUser,
    updateGuildUser,
    isOwner,
    getGuild,
    updateGuild,
    getGlobalSetting,
    setGlobalSetting,
    getUserCount,
    distributeBalanceToAll,
    distributeBalanceRandomly,
    clearAllData,
    resetUser,
    getMarriage,
    createMarriage,
    deleteMarriage,
    addLotteryTicket,
    getLotteryTickets,
    clearLotteryTickets,
    getLotteryJackpot,
    addLotteryJackpot,
    setLotteryJackpot,
    addGuildRole,
    removeGuildRole,
    getGuildRoles,
    getGuildRole,
    getGuildSetting,
    setGuildSetting
};
