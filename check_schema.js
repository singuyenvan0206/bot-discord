const db = require('./src/database');

async function check() {
    try {
        const pool = await db.getDb();
        const { rows } = await pool.query(`
            SELECT id, bounty, wanted_level
            FROM users
            LIMIT 5
        `);
        console.log('User Bounty Data Sample:');
        console.log(rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
