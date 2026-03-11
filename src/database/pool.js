const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL in environment. Please add it to your .env file.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle Postgres client', err);
});

/**
 * SQL Wrappers (Auto translate ? to $1, $2, etc.)
 */
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

module.exports = {
    pool,
    execute,
    queryAll,
    queryOne,
};
