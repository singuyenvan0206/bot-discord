const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'databases.db';
const DB_PATH = path.join(__dirname, '..', DB_NAME);

let db = null;
const MIGRATION_LEVEL = 2; // Current system migration level

async function getDb() {
    if (db) return db;

    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const stats = fs.statSync(DB_PATH);
        if (stats.size === 0) {
            console.error(`⚠️ Database file ${DB_NAME} is empty! Creating a new one to prevent crash.`);
            db = new SQL.Database();
        } else {
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
        }
    } else {
        db = new SQL.Database();
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    initSchema();
    return db;
}

let pendingSave = null;

function _performSave() {
    if (!db) return;
    const tmpPath = `${DB_PATH}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
    try {
        const data = db.export();
        const buffer = Buffer.from(data);

        // Atomic save: write to unique tmp then rename
        fs.writeFileSync(tmpPath, buffer);

        try {
            fs.renameSync(tmpPath, DB_PATH);
        } catch (renameErr) {
            // Windows EPERM/EBUSY fallback: If OneDrive/Antivirus locks rename, write directly
            console.warn(`⚠️ Atomic rename failed (${renameErr.code}), falling back to direct write.`);
            fs.writeFileSync(DB_PATH, buffer);
            try { fs.unlinkSync(tmpPath); } catch (cleanupErr) { }
        }
    } catch (err) {
        console.error('❌ Failed to save database:', err);
    } finally {
        pendingSave = null;
    }
}

function saveDb() {
    if (!db) return;
    if (pendingSave) clearTimeout(pendingSave);
    pendingSave = setTimeout(() => {
        _performSave();
    }, 1000);
}

process.on('exit', () => {
    if (pendingSave) {
        clearTimeout(pendingSave);
        _performSave();
    }
});

function initSchema() {
    const isWordChain = DB_NAME.includes('wordchain.db');

    if (!isWordChain) {
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
    }

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
            active_buffs TEXT DEFAULT '[]',
            purchased_roles TEXT DEFAULT '[]',
            warnings INTEGER DEFAULT 0,
            server_data TEXT DEFAULT '{}'
        )
    `);

    // Mapping table for server memberships (fixes guildId flapping)
    db.run(`
        CREATE TABLE IF NOT EXISTS user_guilds (
            userId TEXT NOT NULL,
            guildId TEXT NOT NULL,
            PRIMARY KEY (userId, guildId),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS guilds (
            id TEXT PRIMARY KEY,
            language TEXT DEFAULT 'vi',
            prefix TEXT,
            dist_channel TEXT,
            json_data TEXT DEFAULT '{}'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS global_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS guild_roles (
            guild_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            income_buff REAL DEFAULT 0,
            xp_buff REAL DEFAULT 0,
            color TEXT,
            PRIMARY KEY (guild_id, role_id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            PRIMARY KEY (guild_id, key)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS marriages (
            guild_id TEXT NOT NULL,
            user1_id TEXT NOT NULL,
            user2_id TEXT NOT NULL,
            ring_id INTEGER DEFAULT 701,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            PRIMARY KEY (guild_id, user1_id, user2_id),
            UNIQUE(guild_id, user1_id),
            UNIQUE(guild_id, user2_id)
        )
    `);

    db.run(`
            CREATE TABLE IF NOT EXISTS lottery_tickets (
                guild_id TEXT,
                user_id TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (guild_id, user_id)
            )
        `);

    if (!isWordChain) {
        // ... (indexes)
        safeAddColumn('marriages', 'ring_id', 'INTEGER DEFAULT 701');
    }

    if (!isWordChain) {
        db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_message ON giveaways(message_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_giveaways_active ON giveaways(ended, ends_at)');
        db.run('CREATE INDEX IF NOT EXISTS idx_participants_giveaway ON participants(giveaway_id)');

        // Migrate existing tables — add new columns if missing
        safeAddColumn('giveaways', 'paused', 'INTEGER NOT NULL DEFAULT 0');
        safeAddColumn('giveaways', 'scheduled_start', 'INTEGER');
        safeAddColumn('participants', 'bonus_entries', 'INTEGER NOT NULL DEFAULT 0');
        safeAddColumn('lottery_tickets', 'guild_id', 'TEXT');
        safeAddColumn('marriages', 'guild_id', 'TEXT');
        safeAddColumn('marriages', 'ring_id', 'INTEGER DEFAULT 701');
    }

    // Guild columns
    safeAddColumn('guilds', 'dist_channel', 'TEXT');

    // User columns
    safeAddColumn('users', 'xp', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('users', 'level', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('users', 'last_work', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'last_dist_amount', 'INTEGER DEFAULT 0');
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
    safeAddColumn('users', 'purchased_roles', "TEXT DEFAULT '[]'");
    safeAddColumn('users', 'warnings', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'server_data', "TEXT DEFAULT '{}'");

    saveDb();

    // Run one-time migrations
    if (!isWordChain) {
        const currentLevel = parseInt(getGlobalSetting('migration_level', '0'));

        if (currentLevel < MIGRATION_LEVEL) {
            console.log(`🚀 Running database migrations (v${currentLevel} -> v${MIGRATION_LEVEL})...`);

            if (currentLevel < 1) {
                migrateInventoryIds();
                migrateUserLanguages();
            }

            if (currentLevel < 2) {
                // Drop and recreate lottery_tickets to fix primary key constraints
                db.run('DROP TABLE IF EXISTS lottery_tickets');
                db.run(`
                    CREATE TABLE IF NOT EXISTS lottery_tickets (
                        guild_id TEXT,
                        user_id TEXT NOT NULL,
                        count INTEGER NOT NULL DEFAULT 0,
                        PRIMARY KEY (guild_id, user_id)
                    )
                `);
            }

            setGlobalSetting('migration_level', MIGRATION_LEVEL.toString());
            console.log('✅ Migrations completed.');
        }
    }
}

/**
 * Migrates inventory string IDs to numerical IDs.
 */
function migrateInventoryIds() {
    const mapping = {
        'cookies': 101, '1': 101,
        'worm_bait': 402, '2': 402,
        'cricket_bait': 404, '3': 404,
        'squid_bait': 405, '4': 405,
        'phone': 201, '5': 201,
        'shield': 202, '6': 202,
        'sword': 203, '7': 203,
        'lamp': 102, '8': 102,
        'dice_set': 301, '9': 301,
        'sneakers': 204, '10': 204,
        'fishing_rod': 408, '11': 408,
        'mining_pick': 205, '12': 205,
        'keyboard': 206, '13': 206,
        'mouse': 207, '14': 207,
        'rug': 104, '15': 104,
        'cards': 302, '16': 302,
        'monitor': 210, '17': 210,
        'laptop': 212, '18': 212,
        'ring': 304, '19': 304,
        'painting': 105, '20': 105,
        'poker_chips': 305, '21': 305,
        'desk': 213, '22': 213,
        'lucky_clover': 307, '23': 307,
        'chair': 215, '24': 215,
        'business_suit': 216, '25': 216,
        'fiberglass_rod': 409, '26': 409,
        'watch': 308, '27': 308,
        'statue': 107, '28': 107,
        'horseshoe': 309, '29': 309,
        'vip_card': 108, '30': 108,
        'carbon_rod': 411, '31': 411,
        'car': 219, '32': 219,
        'mansion': 109, '33': 109,
        'yacht': 220, '34': 220,
        'space_station': 110, '35': 110,
        'time_machine': 310, '36': 310
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
    // Sanitize params: convert undefined to null to avoid sql.js errors
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    stmt.bind(sanitizedParams);
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
    // Sanitize params: convert undefined to null to avoid sql.js errors
    const sanitizedParams = params.map(p => p === undefined ? null : p);
    db.run(sql, sanitizedParams);
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
    if (updates.scheduledStart !== undefined) { fields.push('scheduled_start = ?'); values.push(updates.scheduledStart); }
    if (updates.paused !== undefined) { fields.push('paused = ?'); values.push(updates.paused ? 1 : 0); }
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
    return row ? Number(row.count) : 0;
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

function getUser(userId, guildId = null) {
    let user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
        execute('INSERT INTO users (id) VALUES (?)', [userId]);
        user = { id: userId, balance: 0, xp: 0, level: 0, last_daily: 0, last_work: 0, last_rob: 0, last_crime: 0, last_slut: 0, last_beg: 0, last_search: 0, last_dist_amount: 0, job: null, inventory: '{}', active_buffs: '[]', purchased_roles: '[]', language: null };
    }

    // Track membership without flipping (Stable many-to-many)
    if (guildId) {
        execute('INSERT OR IGNORE INTO user_guilds (userId, guildId) VALUES (?, ?)', [userId, guildId]);
    }

    return user;
}

function getGlobalUser(userId) {
    return getUser(userId);
}

/**
 * One-time migration to clear all user languages, letting them follow server settings.
 */
function migrateUserLanguages() {
    execute('UPDATE users SET language = NULL');
    console.log('✅ Cleared all user language preferences (fallback to server enabled).');
}

function updateUser(guildIdOrUserId, userIdOrUpdates, updatesOnly) {
    let userId, updates;
    if (typeof userIdOrUpdates === 'object') {
        userId = guildIdOrUserId;
        updates = userIdOrUpdates;
    } else {
        userId = userIdOrUpdates;
        updates = updatesOnly;
    }
    return updateGlobalUser(userId, updates);
}

function updateGlobalUser(userId, updates) {
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

function addBalance(guildIdOrUserId, userIdOrAmount, amountOnly) {
    let userId, amount;
    if (typeof userIdOrAmount === 'number') {
        userId = guildIdOrUserId;
        amount = userIdOrAmount;
    } else {
        userId = userIdOrAmount;
        amount = amountOnly;
    }
    return addGlobalBalance(userId, amount);
}

function addGlobalBalance(userId, amount) {
    getGlobalUser(userId);
    execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
}

function removeBalance(guildIdOrUserId, userIdOrAmount, amountOnly) {
    let userId, amount;
    if (typeof userIdOrAmount === 'number') {
        userId = guildIdOrUserId;
        amount = userIdOrAmount;
    } else {
        userId = userIdOrAmount;
        amount = amountOnly;
    }
    return removeGlobalBalance(userId, amount);
}

function removeGlobalBalance(userId, amount) {
    getGlobalUser(userId);
    execute('UPDATE users SET balance = MAX(0, balance - ?) WHERE id = ?', [amount, userId]);
}

function getTopUsers(guildId, limit = 100, type = 'balance', filter = null) {
    // 🔒 Whitelist column
    const allowedColumns = ['balance', 'xp', 'level'];
    if (!allowedColumns.includes(type)) {
        type = 'balance';
    }

    let results = [];
    const queryBase = `
        SELECT users.* 
        FROM users 
        JOIN user_guilds ON users.id = user_guilds.userId 
        WHERE user_guilds.guildId = ?
    `;

    if (filter && filter.column && filter.value !== undefined) {
        results = queryAll(
            `${queryBase} AND users.${filter.column} = ? ORDER BY users.${type} DESC LIMIT ?`,
            [guildId, filter.value, limit]
        );
    } else {
        results = queryAll(
            `${queryBase} ORDER BY users.${type} DESC LIMIT ?`,
            [guildId, limit]
        );
    }

    return results;
}

function addItem(guildIdOrUserId, userIdOrItemId, itemIdOrCount, countOnly = 1) {
    let userId, itemId, count;
    if (typeof userIdOrItemId === 'number' || (typeof userIdOrItemId === 'string' && typeof itemIdOrCount === 'number' && countOnly === 1)) {
        if (arguments.length <= 3 && typeof userIdOrItemId === 'number') {
            userId = guildIdOrUserId;
            itemId = userIdOrItemId;
            count = itemIdOrCount || 1;
            return addGlobalItem(userId, itemId, count);
        }
    }

    if (arguments.length >= 4 || (arguments.length >= 3 && typeof itemIdOrCount === 'number')) {
        userId = userIdOrItemId;
        itemId = itemIdOrCount;
        count = countOnly;
    } else {
        userId = guildIdOrUserId;
        itemId = userIdOrItemId;
        count = itemIdOrCount || 1;
    }
    return addGlobalItem(userId, itemId, count);
}

function addGlobalItem(userId, itemId, count = 1) {
    const user = getGlobalUser(userId);
    const inv = JSON.parse(user.inventory || '{}');
    inv[itemId] = (inv[itemId] || 0) + count;
    execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
}

function removeItem(guildIdOrUserId, userIdOrItemId, itemIdOrCount, countOnly = 1) {
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
    return removeGlobalItem(userId, itemId, count);
}

function removeGlobalItem(userId, itemId, count = 1) {
    const user = getGlobalUser(userId);
    const inv = JSON.parse(user.inventory || '{}');
    if (!inv[itemId]) return false;

    inv[itemId] -= count;
    if (inv[itemId] <= 0) delete inv[itemId];

    execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
    return true;
}

// ─── Server Scope: Guild Data ──────────────────────────────────────────────

function getGuildUser(guildId, userId) {
    return getGlobalUser(userId);
}

function updateGuildUser(guildId, userId, updates) {
    return updateGlobalUser(userId, updates);
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

function getRandomUserByJob(jobId, excludeIds = []) {
    let query = 'SELECT id FROM users WHERE job = ?';
    const params = [jobId];
    if (excludeIds.length > 0) {
        const placeholders = excludeIds.map(() => '?').join(', ');
        query += ` AND id NOT IN (${placeholders})`;
        params.push(...excludeIds);
    }
    const users = queryAll(query, params);
    if (!users || users.length === 0) return null;
    return users[Math.floor(Math.random() * users.length)].id;
}
// ===== GLOBAL SETTINGS =====

function getGlobalSetting(key, defaultValue = null) {
    const row = queryOne('SELECT value FROM global_settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
}

function setGlobalSetting(key, value) {
    execute(`
        INSERT INTO global_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [key, value]);
}

function getUserCount() {
    const row = queryOne('SELECT COUNT(*) as count FROM users');
    return row ? Number(row.count) : 0;
}

function distributeBalanceToAll(amount, excludeUserId = null) {
    if (excludeUserId) {
        execute('UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id != ?', [amount, excludeUserId]);
        execute('UPDATE users SET balance = 0 WHERE id = ?', [excludeUserId]);
    } else {
        execute('UPDATE users SET balance = COALESCE(balance, 0) + ?', [amount]);
    }
}

function distributeBalanceRandomly(totalAmount, excludeUserId = null) {
    let users = queryAll('SELECT id FROM users' + (excludeUserId ? ' WHERE id != ?' : ''), excludeUserId ? [excludeUserId] : []);

    if (users.length === 0) return [];

    let weights = users.map(() => Math.random());
    let totalWeight = weights.reduce((a, b) => a + b, 0);

    let distributed = 0;
    const results = [];

    // Reset all users' last distribution amount to 0
    execute('UPDATE users SET last_dist_amount = 0' + (excludeUserId ? ' WHERE id != ?' : ''), excludeUserId ? [excludeUserId] : []);

    users.forEach((user, i) => {
        let amount = 0;
        if (i === users.length - 1) {
            amount = totalAmount - distributed;
        } else {
            amount = Math.floor((weights[i] / totalWeight) * totalAmount);
            distributed += amount;
        }

        if (amount > 0) {
            // Update balance and last_dist_amount at the same time
            execute('UPDATE users SET balance = balance + ?, last_dist_amount = ? WHERE id = ?', [amount, amount, user.id]);
            results.push({ userId: user.id, amount });
        }
    });

    if (excludeUserId) {
        execute('UPDATE users SET balance = 0, last_dist_amount = 0 WHERE id = ?', [excludeUserId]);
    }

    return results;
}

function clearAllData() {
    execute('DELETE FROM users');
    execute('DELETE FROM giveaways');
    execute('DELETE FROM participants');
    execute('DELETE FROM guilds');
    execute('DELETE FROM global_settings');
    execute('DELETE FROM marriages');
    execute('VACUUM');
}

function resetUser(userId) {
    execute('DELETE FROM users WHERE id = ?', [userId]);
    execute('DELETE FROM participants WHERE user_id = ?', [userId]);
    execute('DELETE FROM participants WHERE user_id = ?', [userId]);
    execute('DELETE FROM lottery_tickets WHERE user_id = ?', [userId]);
    execute('DELETE FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
}

// ─── Marriages ───────────────────────────────────────────────────

function getMarriage(guildId, userId) {
    if (!guildId) return queryOne('SELECT * FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
    return queryOne('SELECT * FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)', [guildId, userId, userId]);
}

function createMarriage(guildId, user1Id, user2Id, ringId = 701) {
    // Ensure consistent order to avoid duplicates
    const [u1, u2] = [user1Id, user2Id].sort();
    if (!guildId) {
        execute('INSERT INTO marriages (user1_id, user2_id, ring_id) VALUES (?, ?, ?)', [u1, u2, ringId]);
        return;
    }
    execute('INSERT INTO marriages (guild_id, user1_id, user2_id, ring_id) VALUES (?, ?, ?, ?)', [guildId, u1, u2, ringId]);
}

function deleteMarriage(guildId, userId) {
    if (!guildId) {
        execute('DELETE FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
        return;
    }
    execute('DELETE FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)', [guildId, userId, userId]);
}

function addLotteryTicket(guildId, userId, count = 1) {
    if (!guildId) {
        execute('INSERT INTO lottery_tickets (user_id, count) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET count = count + excluded.count', [userId, count]);
        return;
    }
    // Need to update lottery_tickets schema to support guild_id
    execute('INSERT INTO lottery_tickets (guild_id, user_id, count) VALUES (?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET count = count + excluded.count', [guildId, userId, count]);
}

function getLotteryTickets(guildId) {
    if (!guildId) return queryAll('SELECT * FROM lottery_tickets WHERE guild_id IS NULL');
    return queryAll('SELECT * FROM lottery_tickets WHERE guild_id = ?', [guildId]);
}

function clearLotteryTickets(guildId) {
    if (!guildId) execute('DELETE FROM lottery_tickets WHERE guild_id IS NULL');
    else execute('DELETE FROM lottery_tickets WHERE guild_id = ?', [guildId]);
}

function getLotteryJackpot(guildId) {
    if (!guildId) {
        const val = getGlobalSetting('lottery_jackpot');
        if (!val) {
            const config = require('./config');
            setGlobalSetting('lottery_jackpot', config.ECONOMY.LOTTERY.INITIAL_JACKPOT.toString());
            return config.ECONOMY.LOTTERY.INITIAL_JACKPOT;
        }
        return parseInt(val);
    }
    const val = getGuildSetting(guildId, 'lottery_jackpot');
    if (!val) {
        const config = require('./config');
        setGuildSetting(guildId, 'lottery_jackpot', config.ECONOMY.LOTTERY.INITIAL_JACKPOT);
        return config.ECONOMY.LOTTERY.INITIAL_JACKPOT;
    }
    return parseInt(val);
}

function addLotteryJackpot(guildId, amount) {
    const current = getLotteryJackpot(guildId);
    if (!guildId) setGlobalSetting('lottery_jackpot', (current + amount).toString());
    else setGuildSetting(guildId, 'lottery_jackpot', (current + amount));
}

function setLotteryJackpot(guildId, amount) {
    if (!guildId) setGlobalSetting('lottery_jackpot', amount.toString());
    else setGuildSetting(guildId, 'lottery_jackpot', amount);
}

// ─── Guild Roles (Role Shop) ──────────────────────────────────────

function addGuildRole(guildId, roleId, name, price, incomeBuff, xpBuff, color) {
    execute(`
        INSERT INTO guild_roles (guild_id, role_id, name, price, income_buff, xp_buff, color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, role_id) DO UPDATE SET
            name = excluded.name,
            price = excluded.price,
            income_buff = excluded.income_buff,
            xp_buff = excluded.xp_buff,
            color = excluded.color
    `, [guildId, roleId, name, price, incomeBuff, xpBuff, color]);
}

function removeGuildRole(guildId, roleId) {
    execute('DELETE FROM guild_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
}

function getGuildRoles(guildId) {
    return queryAll('SELECT * FROM guild_roles WHERE guild_id = ? ORDER BY price ASC', [guildId]);
}

function getGuildRole(guildId, roleId) {
    return queryOne('SELECT * FROM guild_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
}

// ─── Guild Settings (Dynamic Config) ─────────────────────────────

function getGuildSetting(guildId, key, defaultValue = null) {
    const row = queryOne('SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?', [guildId, key]);
    if (row) {
        // Try to parse number if it looks like one, otherwise return string
        const val = row.value;
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (!isNaN(val) && val.trim() !== '') return Number(val);
        return val;
    }
    return defaultValue;
}

function setGuildSetting(guildId, key, value) {
    execute(`
        INSERT INTO guild_settings (guild_id, key, value)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, key) DO UPDATE SET value = excluded.value
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
