require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        console.log('--- All Users with Balance ---');
        const { rows } = await pool.query('SELECT id, balance FROM users WHERE balance > 0');
        console.log(JSON.stringify(rows, null, 2));
        
        const { rows: guildSettings } = await pool.query("SELECT * FROM guild_settings WHERE key = 'bot_balance'");
        console.log('\n--- Bot Balance in Guild Settings ---');
        console.log(JSON.stringify(guildSettings, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
