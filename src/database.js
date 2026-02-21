const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'giveaways.db');

let db = null;

async function getDb() {
    if (db) return db;

    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    initSchema();
    return db;
}

function saveDb() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

function initSchema() {
    db.run(`
        CREATE TABLE IF NOT EXISTS giveaways (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT UNIQUE,
            host_id TEXT NOT NULL,
            prize TEXT NOT NULL,
            description TEXT,
            winner_count INTEGER NOT NULL DEFAULT 1,
            required_role_id TEXT,
            ends_at INTEGER NOT NULL,
            ended INTEGER NOT NULL DEFAULT 0,
            paused INTEGER NOT NULL DEFAULT 0,
            scheduled_start INTEGER,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            giveaway_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            bonus_entries INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
            UNIQUE(giveaway_id, user_id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            balance INTEGER NOT NULL DEFAULT 0,
            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 0,
            last_daily INTEGER DEFAULT 0,
            last_work INTEGER DEFAULT 0,
            last_rob INTEGER DEFAULT 0,
            last_crime INTEGER DEFAULT 0,
            last_slut INTEGER DEFAULT 0,
            last_beg INTEGER DEFAULT 0,
            last_search INTEGER DEFAULT 0,
            job TEXT DEFAULT NULL,
            inventory TEXT DEFAULT '{}',
            active_buffs TEXT DEFAULT '[]'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS guild_users (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            warnings INTEGER DEFAULT 0,
            json_data TEXT DEFAULT '{}',
            PRIMARY KEY (guild_id, user_id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS guild_users (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            warnings INTEGER DEFAULT 0,
            json_data TEXT DEFAULT '{}',
            PRIMARY KEY (guild_id, user_id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS guilds (
            id TEXT PRIMARY KEY,
            language TEXT DEFAULT 'vi',
            prefix TEXT,
            json_data TEXT DEFAULT '{}'
        )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_message ON giveaways(message_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_active ON giveaways(ended, ends_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_participants_giveaway ON participants(giveaway_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_guild_users_guild ON guild_users(guild_id)');

    // Migrate existing tables — add new columns if missing
    safeAddColumn('giveaways', 'paused', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('giveaways', 'scheduled_start', 'INTEGER');
    safeAddColumn('participants', 'bonus_entries', 'INTEGER NOT NULL DEFAULT 0');
    // User columns
    safeAddColumn('users', 'xp', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('users', 'level', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('users', 'last_work', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'last_rob', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'last_crime', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'last_slut', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'last_beg', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'last_search', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'last_daily', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'job', 'TEXT DEFAULT NULL');
    safeAddColumn('users', 'inventory', "TEXT DEFAULT '{}'");
    safeAddColumn('users', 'language', 'TEXT DEFAULT NULL');
    safeAddColumn('users', 'active_buffs', "TEXT DEFAULT '[]'");

    migrateInventoryIds();
    migrateUserLanguages();

    saveDb();
}

/**
 * Migrates inventory string IDs to numerical IDs.
 */
function migrateInventoryIds() {
    const mapping = {
        'cookies': 1, 'worm_bait': 2, 'cricket_bait': 3, 'squid_bait': 4,
        'phone': 5, 'shield': 6, 'sword': 7, 'lamp': 8, 'dice_set': 9,
        'sneakers': 10, 'fishing_rod': 11, 'mining_pick': 12, 'keyboard': 13,
        'mouse': 14, 'rug': 15, 'cards': 16, 'monitor': 17, 'laptop': 18,
        'ring': 19, 'painting': 20, 'poker_chips': 21, 'desk': 22,
        'lucky_clover': 23, 'chair': 24, 'business_suit': 25, 'fiberglass_rod': 26,
        'watch': 27, 'statue': 28, 'slot_token': 29, 'vip_card': 30,
        'horseshoe': 31, 'golden_ticket': 32, 'carbon_rod': 33, 'car': 34,
        'mansion': 35, 'yacht': 36, 'space_station': 37, 'time_machine': 38
    };

    const users = queryAll('SELECT id, inventory FROM users');
    let migratedCount = 0;

    for (const user of users) {
        if (!user.inventory || user.inventory === '{}') continue;

        try {
            const inv = JSON.parse(user.inventory);
            const newInv = {};
            let changed = false;

            for (const [oldId, count] of Object.entries(inv)) {
                if (mapping[oldId]) {
                    newInv[mapping[oldId]] = count;
                    changed = true;
                } else {
                    newInv[oldId] = count; // Keep as is if not in mapping
                }
            }

            if (changed) {
                execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(newInv), user.id]);
                migratedCount++;
            }
        } catch (e) {
            console.error(`Failed to migrate inventory for user ${user.id}:`, e);
        }
    }
    if (migratedCount > 0) console.log(`✅ Migrated ${migratedCount} user inventories to numerical IDs.`);
}

/**
 * Safely add a column if it doesn't already exist.
 */
function safeAddColumn(table, column, definition) {
    try {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch {
        // Column already exists — ignore
    }
}

// ─── Helper: Convert sql.js result to array of objects ───────────

function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

function execute(sql, params = []) {
    db.run(sql, params);
    saveDb();
}

// ─── Giveaway CRUD ───────────────────────────────────────────────

function createGiveaway({ guildId, channelId, messageId, hostId, prize, description, winnerCount, requiredRoleId, endsAt, scheduledStart }) {
    execute(
        `INSERT INTO giveaways (guild_id, channel_id, message_id, host_id, prize, description, winner_count, required_role_id, ends_at, scheduled_start)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [guildId, channelId, messageId, hostId, prize, description || null, winnerCount, requiredRoleId || null, endsAt, scheduledStart || null]
    );
    const row = queryOne('SELECT last_insert_rowid() as id');
    return row ? row.id : null;
}

function getGiveaway(messageId) {
    return queryOne('SELECT * FROM giveaways WHERE message_id = ?', [messageId]);
}

function getGiveawayById(id) {
    return queryOne('SELECT * FROM giveaways WHERE id = ?', [id]);
}

function getActiveGiveaways(guildId) {
    if (guildId) {
        return queryAll('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 AND (scheduled_start IS NULL OR scheduled_start <= ?) ORDER BY ends_at ASC', [guildId, Math.floor(Date.now() / 1000)]);
    }
    return queryAll('SELECT * FROM giveaways WHERE ended = 0 AND (scheduled_start IS NULL OR scheduled_start <= ?) ORDER BY ends_at ASC', [Math.floor(Date.now() / 1000)]);
}

function getExpiredGiveaways() {
    const now = Math.floor(Date.now() / 1000);
    return queryAll('SELECT * FROM giveaways WHERE ended = 0 AND paused = 0 AND ends_at <= ? AND (scheduled_start IS NULL OR scheduled_start <= ?)', [now, now]);
}

function getScheduledGiveaways() {
    const now = Math.floor(Date.now() / 1000);
    return queryAll('SELECT * FROM giveaways WHERE ended = 0 AND scheduled_start IS NOT NULL AND scheduled_start <= ? AND message_id IS NULL', [now]);
}

function endGiveaway(messageId) {
    execute('UPDATE giveaways SET ended = 1 WHERE message_id = ?', [messageId]);
}

function pauseGiveaway(messageId) {
    execute('UPDATE giveaways SET paused = 1 WHERE message_id = ?', [messageId]);
}

function resumeGiveaway(messageId) {
    execute('UPDATE giveaways SET paused = 0 WHERE message_id = ?', [messageId]);
}

function updateGiveaway(messageId, updates) {
    const fields = [];
    const values = [];
    if (updates.prize !== undefined) { fields.push('prize = ?'); values.push(updates.prize); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.winnerCount !== undefined) { fields.push('winner_count = ?'); values.push(updates.winnerCount); }
    if (updates.endsAt !== undefined) { fields.push('ends_at = ?'); values.push(updates.endsAt); }
    if (fields.length === 0) return;
    values.push(messageId);
    execute(`UPDATE giveaways SET ${fields.join(', ')} WHERE message_id = ?`, values);
}

function deleteGiveaway(messageId) {
    // Delete participants first (manual cascade since sql.js doesn't support FK enforcement well)
    const giveaway = getGiveaway(messageId);
    if (giveaway) {
        execute('DELETE FROM participants WHERE giveaway_id = ?', [giveaway.id]);
    }
    execute('DELETE FROM giveaways WHERE message_id = ?', [messageId]);
}

// ─── Participants ────────────────────────────────────────────────

function addParticipant(giveawayId, userId) {
    try {
        execute('INSERT OR IGNORE INTO participants (giveaway_id, user_id) VALUES (?, ?)', [giveawayId, userId]);
    } catch {
        // Already exists — ignore
    }
}

function removeParticipant(giveawayId, userId) {
    execute('DELETE FROM participants WHERE giveaway_id = ? AND user_id = ?', [giveawayId, userId]);
}

function getParticipants(giveawayId) {
    return queryAll('SELECT user_id, bonus_entries FROM participants WHERE giveaway_id = ?', [giveawayId]);
}

function getParticipantUserIds(giveawayId) {
    return queryAll('SELECT user_id FROM participants WHERE giveaway_id = ?', [giveawayId]).map(r => r.user_id);
}

function getParticipantCount(giveawayId) {
    const row = queryOne('SELECT COUNT(*) as count FROM participants WHERE giveaway_id = ?', [giveawayId]);
    return row ? row.count : 0;
}

function getTotalEntries(giveawayId) {
    const row = queryOne('SELECT COUNT(*) + COALESCE(SUM(bonus_entries), 0) as total FROM participants WHERE giveaway_id = ?', [giveawayId]);
    return row ? row.total : 0;
}

function addBonusEntry(giveawayId, userId, count = 1) {
    try {
        // First ensure user is a participant
        execute('INSERT OR IGNORE INTO participants (giveaway_id, user_id) VALUES (?, ?)', [giveawayId, userId]);
        execute('UPDATE participants SET bonus_entries = bonus_entries + ? WHERE giveaway_id = ? AND user_id = ?', [count, giveawayId, userId]);
    } catch {
        // ignore
    }
}

function getBonusEntries(giveawayId, userId) {
    const row = queryOne('SELECT bonus_entries FROM participants WHERE giveaway_id = ? AND user_id = ?', [giveawayId, userId]);
    return row ? row.bonus_entries : 0;
}


// ─── Global Scope: User / Economy ──────────────────────────────────────────────

function getUser(userId) {
    let user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
        execute('INSERT INTO users (id) VALUES (?)', [userId]);
        user = { id: userId, balance: 0, xp: 0, level: 0, last_daily: 0, last_work: 0, last_rob: 0, last_crime: 0, last_slut: 0, last_beg: 0, last_search: 0, job: null, inventory: '{}', active_buffs: '[]', language: null };
    }
    return user;
}

/**
 * One-time migration to clear all user languages, letting them follow server settings.
 */
function migrateUserLanguages() {
    execute('UPDATE users SET language = NULL');
    console.log('✅ Cleared all user language preferences (fallback to server enabled).');
}

function updateUser(userId, updates) {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
    });
    if (fields.length === 0) return;
    values.push(userId);
    execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

function addBalance(userId, amount) {
    getUser(userId); // Ensure user exists
    execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
}

function removeBalance(userId, amount) {
    getUser(userId); // Ensure user exists
    execute('UPDATE users SET balance = MAX(0, balance - ?) WHERE id = ?', [amount, userId]);
}

function getTopUsers(limit = 100, type = 'balance') {
    return queryAll(`SELECT * FROM users ORDER BY ${type} DESC LIMIT ?`, [limit]);
}

function addItem(userId, itemId, count = 1) {
    const user = getUser(userId);
    const inv = JSON.parse(user.inventory || '{}');
    inv[itemId] = (inv[itemId] || 0) + count;
    execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
}

function removeItem(userId, itemId, count = 1) {
    const user = getUser(userId);
    const inv = JSON.parse(user.inventory || '{}');
    if (!inv[itemId]) return false;

    inv[itemId] -= count;
    if (inv[itemId] <= 0) delete inv[itemId];

    execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
    return true;
}

// ─── Server Scope: Guild Data ──────────────────────────────────────────────

function getGuildUser(guildId, userId) {
    let user = queryOne('SELECT * FROM guild_users WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
    if (!user) {
        execute('INSERT INTO guild_users (guild_id, user_id) VALUES (?, ?)', [guildId, userId]);
        user = { guild_id: guildId, user_id: userId, warnings: 0, json_data: '{}' };
    }
    return user;
}

function updateGuildUser(guildId, userId, updates) {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
    });
    if (fields.length === 0) return;
    values.push(guildId);
    values.push(userId);
    execute(`UPDATE guild_users SET ${fields.join(', ')} WHERE guild_id = ? AND user_id = ?`, values);
}

// ─── Owner Permissions ──────────────────────────────────────────────

function isOwner(userId) {
    return process.env.OWNER_ID === userId;
}

// ─── Guilds ─────────────────────────────────────────────────────────

function getGuild(guildId) {
    let guild = queryOne('SELECT * FROM guilds WHERE id = ?', [guildId]);
    if (!guild) {
        execute('INSERT INTO guilds (id) VALUES (?)', [guildId]);
        guild = { id: guildId, language: 'vi', prefix: null, json_data: '{}' };
    }
    return guild;
}

function updateGuild(guildId, updates) {
    const fields = [];
    const values = [];
    Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
    });
    if (fields.length === 0) return;
    values.push(guildId);
    execute(`UPDATE guilds SET ${fields.join(', ')} WHERE id = ?`, values);
}

function getRandomUserByJob(jobId) {
    const users = queryAll('SELECT id FROM users WHERE job = ?', [jobId]);
    if (!users || users.length === 0) return null;
    return users[Math.floor(Math.random() * users.length)].id;
}

module.exports = {
    getDb,
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
};
