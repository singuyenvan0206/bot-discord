const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    console.log('🚀 Starting Manual Schema Migration...');
    
    const safeAddColumn = async (table, column, definition) => {
        try {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            console.log(`✅ Added column ${column} to ${table}`);
        } catch (error) {
            if (error.code === '42701') {
                console.log(`ℹ️ Column ${column} already exists in ${table}`);
            } else {
                console.error(`❌ Error adding ${column} to ${table}:`, error.message);
            }
        }
    };

    try {
        // Users table
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
        await safeAddColumn('users', 'daily_streak', 'INTEGER DEFAULT 0');

        // User Guilds table
        await safeAddColumn('user_guilds', 'balance', 'BIGINT NOT NULL DEFAULT 0');
        await safeAddColumn('user_guilds', 'xp', 'BIGINT NOT NULL DEFAULT 0');
        await safeAddColumn('user_guilds', 'level', 'INTEGER NOT NULL DEFAULT 0');
        await safeAddColumn('user_guilds', 'inventory', "TEXT DEFAULT '{}'");

        // Guilds table
        await safeAddColumn('guilds', 'wordchain_channel', 'TEXT DEFAULT NULL');

        console.log('\n✨ Migration finished!');
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Migration CRASHED:', error);
        process.exit(1);
    }
}

migrate();
