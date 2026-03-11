const { pool } = require('./pool');

async function initSchema() {
    // ─── Tables ───
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
            last_freelance BIGINT DEFAULT 0,
            last_beg BIGINT DEFAULT 0,
            last_search BIGINT DEFAULT 0,
            job TEXT DEFAULT NULL,
            inventory TEXT DEFAULT '{}',
            active_buffs TEXT DEFAULT '[]',
            purchased_roles TEXT DEFAULT '[]',
            warnings INTEGER DEFAULT 0,
            banned BOOLEAN DEFAULT FALSE,
            language TEXT DEFAULT NULL,
            server_data TEXT DEFAULT '{}',
            last_dist_amount BIGINT DEFAULT 0,
            house_id TEXT DEFAULT NULL,
            house_data TEXT DEFAULT '{}',
            milestone_count INTEGER NOT NULL DEFAULT 0,
            prison_until BIGINT DEFAULT 0,
            bounty BIGINT DEFAULT 0,
            wanted_level INTEGER DEFAULT 0,
            wanted_expires_at BIGINT DEFAULT 0,
            bounty_placers TEXT DEFAULT '[]',
            spam_violations INTEGER DEFAULT 0
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_guilds (
            userId TEXT NOT NULL,
            guildId TEXT NOT NULL,
            PRIMARY KEY (userId, guildId)
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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_businesses (
            user_id TEXT NOT NULL,
            business_id TEXT NOT NULL,
            level INTEGER NOT NULL DEFAULT 1,
            staff INTEGER NOT NULL DEFAULT 0,
            last_collect BIGINT DEFAULT 0,
            PRIMARY KEY (user_id, business_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS pending_bounties (
            id SERIAL PRIMARY KEY,
            guild_id TEXT NOT NULL,
            placer_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            amount BIGINT NOT NULL,
            reason TEXT,
            created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()))
        )
    `);

    // ─── Migrations (Safe column additions) ───
    const safeAddColumn = async (table, column, definition) => {
        try { await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`); } catch { }
    };

    await safeAddColumn('users', 'prison_until', 'BIGINT DEFAULT 0');
    await safeAddColumn('users', 'bounty', 'BIGINT DEFAULT 0');
    await safeAddColumn('users', 'wanted_level', 'INTEGER DEFAULT 0');
    await safeAddColumn('users', 'wanted_expires_at', 'BIGINT DEFAULT 0');
    await safeAddColumn('users', 'bounty_placers', "TEXT DEFAULT '[]'");
    await safeAddColumn('users', 'spam_violations', 'INTEGER DEFAULT 0');
    await safeAddColumn('users', 'last_arrest', 'BIGINT DEFAULT 0');
    await safeAddColumn('users', 'last_mentor', 'BIGINT DEFAULT 0');
    await safeAddColumn('users', 'last_market', 'BIGINT DEFAULT 0');
    await safeAddColumn('users', 'last_harvest', 'BIGINT DEFAULT 0');
    await safeAddColumn('users', 'last_hack', 'BIGINT DEFAULT 0');

    // Guild Migrations
    await safeAddColumn('guilds', 'wordchain_channel', 'TEXT DEFAULT NULL');
}

module.exports = { initSchema };
