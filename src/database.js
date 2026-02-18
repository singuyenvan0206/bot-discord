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

    db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_message ON giveaways(message_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_active ON giveaways(ended, ends_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_participants_giveaway ON participants(giveaway_id)');

    // Migrate existing tables — add new columns if missing
    safeAddColumn('giveaways', 'paused', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('giveaways', 'scheduled_start', 'INTEGER');
    safeAddColumn('participants', 'bonus_entries', 'INTEGER NOT NULL DEFAULT 0');

    saveDb();
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
        [guildId, channelId, messageId, hostId, prize, description, winnerCount, requiredRoleId, endsAt, scheduledStart || null]
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
};
