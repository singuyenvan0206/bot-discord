const { pool, execute, queryAll, queryOne } = require('./pool');
const { getGuildSetting, setGuildSetting } = require('./guilds');

let botId = null;

async function setBotId(id) {
    botId = String(id);
}

async function getUser(userId, guildId = null) {
    if (!userId) return null;
    const uId = String(userId);

    if (guildId && uId === botId) {
        const balance = await getGuildSetting(guildId, 'bot_balance', 0);
        const xp = await getGuildSetting(guildId, 'bot_xp', 0);
        const level = await getGuildSetting(guildId, 'bot_level', 0);

        return {
            id: uId,
            balance: Number(balance),
            xp: Number(xp),
            level: Number(level),
            job: 'bot',
            inventory: '{}',
            active_buffs: '[]',
            purchased_roles: '[]',
            language: 'vi',
            fish_ledger: '{}',
            bounty: 0,
            wanted_level: 0,
            banned: false,
            skill_data: '{}',
            aquarium_data: '{}'
        };
    }

    let user = await queryOne('SELECT * FROM users WHERE id = ?', [uId]);
    if (!user) {
        await execute('INSERT INTO users (id) VALUES (?) ON CONFLICT DO NOTHING', [uId]);
        user = await queryOne('SELECT * FROM users WHERE id = ?', [uId]);
        if (!user) {
            user = {
                id: uId, balance: 0, xp: 0, level: 0,
                last_daily: 0, last_work: 0, last_rob: 0, last_crime: 0, last_freelance: 0, last_beg: 0, last_search: 0, last_dist_amount: 0,
                job: null, inventory: '{}', active_buffs: '[]', purchased_roles: '[]', language: null,
                banned: false,
                fish_ledger: '{}', bounty: 0, wanted_level: 0, skill_data: '{}', aquarium_data: '{}'
            };
        }
    }

    if (guildId) {
        await execute('INSERT INTO user_guilds (userId, guildId) VALUES (?, ?) ON CONFLICT DO NOTHING', [uId, guildId]);
    }

    user.balance = Number(user.balance || 0);
    user.xp = Number(user.xp || 0);
    user.level = Number(user.level || 0);

    return user;
}

async function getUserJob(userId, guildId = null) {
    const user = await getUser(userId, guildId);
    return user ? user.job : null;
}

async function getGlobalUser(userId) {
    return await getUser(userId);
}

async function updateGlobalUser(userId, updates) {
    if (!userId) return;
    const uId = String(userId);
    const fields = [];
    const values = [];
    let i = 1;

    Object.entries(updates).forEach(([key, value]) => {
        let sanitizedValue = value;
        if (typeof value === 'number' && isNaN(value)) {
            console.error(`⚠️ Detected NaN update for user ${uId} on field ${key}. Setting to 0.`);
            sanitizedValue = 0;
        }
        fields.push(`${key} = $${i++}`);
        values.push(sanitizedValue);
    });

    if (fields.length === 0) return;
    values.push(uId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
}

async function addGlobalBalance(userId, amount) {
    if (!userId) return;
    const uId = String(userId);
    await execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, uId]);
}

async function addGlobalXp(userId, xpAmount, guildId = null) {
    if (!userId) return;
    const uId = String(userId);

    if (guildId && uId === botId) {
        const currentXp = await getGuildSetting(guildId, 'bot_xp', 0);
        const currentLevel = await getGuildSetting(guildId, 'bot_level', 0);
        const newXp = Number(currentXp) + xpAmount;
        await setGuildSetting(guildId, 'bot_xp', newXp);
        return { xp: newXp, level: currentLevel };
    }

    const result = await queryOne('UPDATE users SET xp = xp + ? WHERE id = ? RETURNING xp, level', [xpAmount, uId]);
    return result;
}

async function setGlobalLevel(userId, level) {
    if (!userId) return;
    const uId = String(userId);
    await execute('UPDATE users SET level = ? WHERE id = ?', [level, uId]);
}

async function removeGlobalBalance(userId, amount) {
    await execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);
}

async function getTopUsers(guildId, limit = 100, type = 'balance', filter = null) {
    const allowedColumns = ['balance', 'xp', 'level'];
    if (!allowedColumns.includes(type)) type = 'balance';

    let query = `
        SELECT users.* 
        FROM users 
        JOIN user_guilds ON users.id = user_guilds.userId 
        WHERE user_guilds.guildId = $1
    `;
    const params = [guildId];

    if (filter && filter.column && filter.value !== undefined) {
        query += ` AND users.${filter.column} = $2 ORDER BY users.${type} DESC LIMIT $3`;
        params.push(filter.value, limit);
    } else {
        query += ` ORDER BY users.${type} DESC LIMIT $2`;
        params.push(limit);
    }

    const { rows } = await pool.query(query, params);
    return rows.map(u => ({ ...u, balance: Number(u.balance), xp: Number(u.xp) }));
}

async function addGlobalItem(userId, itemId, count = 1) {
    const user = await getGlobalUser(userId);
    const inv = JSON.parse(user.inventory || '{}');
    inv[itemId] = (inv[itemId] || 0) + count;
    await execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
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

async function isOwner(userId) {
    return process.env.OWNER_ID === userId;
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

async function getUserCount() {
    const row = await queryOne('SELECT COUNT(*) as count FROM users');
    return row ? Number(row.count) : 0;
}

async function resetUser(userId) {
    await execute('DELETE FROM users WHERE id = ?', [userId]);
    await execute('DELETE FROM participants WHERE user_id = ?', [userId]);
    await execute('DELETE FROM lottery_tickets WHERE user_id = ?', [userId]);
    await execute('DELETE FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
}

async function addAllBalance(amount) {
    await execute('UPDATE users SET balance = balance + ?', [amount]);
}

async function removeAllBalance(amount) {
    await execute('UPDATE users SET balance = GREATEST(0, balance - ?)', [amount]);
}

async function addAllLevel(amount) {
    const config = require('../config');
    const milestoneInterval = config.ECONOMY?.LEVELING?.MILESTONE_INTERVAL || 20;
    await execute(`
        UPDATE users 
        SET level = level + ?,
            xp = CAST(POWER((level + ?) / 0.1, 2) AS BIGINT),
            milestone_count = FLOOR((level + ?) / ?)
    `, [amount, amount, amount, milestoneInterval]);
}

async function removeAllLevel(amount) {
    const config = require('../config');
    const milestoneInterval = config.ECONOMY?.LEVELING?.MILESTONE_INTERVAL || 20;
    await execute(`
        UPDATE users 
        SET level = GREATEST(0, level - ?),
            xp = CAST(POWER(GREATEST(0, level - ?) / 0.1, 2) AS BIGINT),
            milestone_count = FLOOR(GREATEST(0, level - ?) / ?)
    `, [amount, amount, amount, milestoneInterval]);
}

async function addBalance(guildId, userId, amount) {
    return await addGlobalBalance(userId, amount);
}

async function removeBalance(guildId, userId, amount) {
    return await removeGlobalBalance(userId, amount);
}

async function updateUser(guildId, userId, updates) {
    return await updateGlobalUser(userId, updates);
}

module.exports = {
    setBotId,
    getUser,
    getUserJob,
    getGlobalUser,
    updateGlobalUser,
    updateUser,
    addGlobalBalance,
    addBalance,
    addGlobalXp,
    setGlobalLevel,
    removeGlobalBalance,
    removeBalance,
    getTopUsers,
    addGlobalItem,
    removeGlobalItem,
    isOwner,
    getRandomUserByJob,
    getUserCount,
    resetUser,
    addAllBalance,
    removeAllBalance,
    addAllLevel,
    removeAllLevel
};
