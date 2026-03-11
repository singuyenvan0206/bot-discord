const { pool, execute, queryAll, queryOne } = require('./pool');
const { getGuildSetting, setGuildSetting } = require('./guilds');

let botId = null;

async function setBotId(id) {
    botId = String(id);
}

async function getUser(userId, guildId = null) {
    try {
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
            const config = require('../config');
            await execute('INSERT INTO user_guilds (userId, guildId) VALUES (?, ?) ON CONFLICT DO NOTHING', [uId, guildId]);
            
            if (config.ECONOMY?.PER_SERVER_STATS) {
                const serverStats = await queryOne('SELECT balance, xp, level, inventory FROM user_guilds WHERE userId = ? AND guildId = ?', [uId, guildId]);
                if (serverStats) {
                    user.balance = Number(serverStats.balance || 0);
                    user.xp = Number(serverStats.xp || 0);
                    user.level = Number(serverStats.level || 0);
                    user.inventory = serverStats.inventory || '{}';
                    user.is_server_data = true;
                }
            }
        }

        user.balance = Number(user.balance || 0);
        user.xp = Number(user.xp || 0);
        user.level = Number(user.level || 0);

        return user;
    } catch (error) {
        console.error(`Error in getUser for user ${userId}:`, error);
        throw error;
    }
}

async function getUserJob(userId, guildId = null) {
    try {
        const user = await getUser(userId, guildId);
        return user ? user.job : null;
    } catch (error) {
        console.error(`Error in getUserJob for user ${userId}:`, error);
        throw error;
    }
}

async function getGlobalUser(userId) {
    return await getUser(userId);
}

async function updateGlobalUser(userId, updates, guildId = null) {
    try {
        if (!userId) return;
        const uId = String(userId);
        const config = require('../config');
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

        if (guildId && config.ECONOMY?.PER_SERVER_STATS) {
            // Check if column exists in user_guilds or if it's a JSON field
            const allowedServerFields = ['balance', 'xp', 'level', 'inventory'];
            const actualUpdates = {};
            let hasServerField = false;

            Object.keys(updates).forEach(key => {
                if (allowedServerFields.includes(key)) {
                    hasServerField = true;
                }
            });

            if (hasServerField) {
                // For simplicity, we only update specific per-server fields in user_guilds
                // Other fields remain global in the 'users' table
                const serverFields = [];
                const serverValues = [];
                let si = 1;
                Object.entries(updates).forEach(([key, value]) => {
                    if (allowedServerFields.includes(key)) {
                        serverFields.push(`${key} = $${si++}`);
                        serverValues.push(value);
                    }
                });
                if (serverFields.length > 0) {
                    serverValues.push(uId, guildId);
                    await pool.query(`UPDATE user_guilds SET ${serverFields.join(', ')} WHERE userId = $${si++} AND guildId = $${si}`, serverValues);
                }
            }
            
            // Still update the rest in the global 'users' table if needed
            const globalFields = [];
            const globalValues = [];
            let gi = 1;
            Object.entries(updates).forEach(([key, value]) => {
                if (!allowedServerFields.includes(key)) {
                    globalFields.push(`${key} = $${gi++}`);
                    globalValues.push(value);
                }
            });
            if (globalFields.length > 0) {
                globalValues.push(uId);
                await pool.query(`UPDATE users SET ${globalFields.join(', ')} WHERE id = $${gi}`, globalValues);
            }
        } else {
            await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
        }
    } catch (error) {
        console.error(`Error in updateGlobalUser for user ${userId}:`, error);
        throw error;
    }
}

async function addGlobalBalance(userId, amount, guildId = null) {
    try {
        if (!userId) return;
        const uId = String(userId);
        const config = require('../config');

        // IF this is the bot and we have a guildId, redirect to guild_settings
        if (guildId && uId === botId) {
            const currentBalance = await getGuildSetting(guildId, 'bot_balance', 0);
            await setGuildSetting(guildId, 'bot_balance', Number(currentBalance) + amount);
            return;
        }

        if (guildId && config.ECONOMY?.PER_SERVER_STATS) {
            await execute('UPDATE user_guilds SET balance = balance + ? WHERE userId = ? AND guildId = ?', [amount, uId, guildId]);
        } else {
            await execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, uId]);
        }
    } catch (error) {
        console.error(`Error in addGlobalBalance for user ${userId}:`, error);
        throw error;
    }
}

async function addGlobalXp(userId, xpAmount, guildId = null) {
    try {
        if (!userId) return;
        const uId = String(userId);
        const config = require('../config');

        if (guildId && uId === botId) {
            const currentXp = await getGuildSetting(guildId, 'bot_xp', 0);
            const currentLevel = await getGuildSetting(guildId, 'bot_level', 0);
            const newXp = Number(currentXp) + xpAmount;
            await setGuildSetting(guildId, 'bot_xp', newXp);
            return { xp: newXp, level: currentLevel };
        }

        if (guildId && config.ECONOMY?.PER_SERVER_STATS) {
            const result = await queryOne('UPDATE user_guilds SET xp = xp + ? WHERE userId = ? AND guildId = ? RETURNING xp, level', [xpAmount, uId, guildId]);
            return result;
        }

        const result = await queryOne('UPDATE users SET xp = xp + ? WHERE id = ? RETURNING xp, level', [xpAmount, uId]);
        return result;
    } catch (error) {
        console.error(`Error in addGlobalXp for user ${userId}:`, error);
        throw error;
    }
}

async function setGlobalLevel(userId, level, guildId = null) {
    try {
        if (!userId) return;
        const uId = String(userId);
        const config = require('../config');

        if (guildId && config.ECONOMY?.PER_SERVER_STATS) {
            await execute('UPDATE user_guilds SET level = ? WHERE userId = ? AND guildId = ?', [level, uId, guildId]);
        } else {
            await execute('UPDATE users SET level = ? WHERE id = ?', [level, uId]);
        }
    } catch (error) {
        console.error(`Error in setGlobalLevel for user ${userId}:`, error);
        throw error;
    }
}

async function removeGlobalBalance(userId, amount, guildId = null) {
    try {
        const uId = String(userId);
        const config = require('../config');

        // IF this is the bot and we have a guildId, redirect to guild_settings
        if (guildId && uId === botId) {
            const currentBalance = await getGuildSetting(guildId, 'bot_balance', 0);
            await setGuildSetting(guildId, 'bot_balance', Math.max(0, Number(currentBalance) - amount));
            return;
        }

        if (guildId && config.ECONOMY?.PER_SERVER_STATS) {
            await execute('UPDATE user_guilds SET balance = balance - ? WHERE userId = ? AND guildId = ?', [amount, uId, guildId]);
        } else {
            await execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, uId]);
        }
    } catch (error) {
        console.error(`Error in removeGlobalBalance for user ${userId}:`, error);
        throw error;
    }
}

async function getTopUsers(guildId, limit = 100, type = 'balance', filter = null) {
    try {
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
    } catch (error) {
        console.error(`Error in getTopUsers for guild ${guildId}:`, error);
        throw error;
    }
}

async function addGlobalItem(userId, itemId, count = 1) {
    try {
        const user = await getGlobalUser(userId);
        const inv = JSON.parse(user.inventory || '{}');
        inv[itemId] = (inv[itemId] || 0) + count;
        await execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
    } catch (error) {
        console.error(`Error in addGlobalItem for user ${userId}, item ${itemId}:`, error);
        throw error;
    }
}

async function removeGlobalItem(userId, itemId, count = 1) {
    try {
        const user = await getGlobalUser(userId);
        const inv = JSON.parse(user.inventory || '{}');
        if (!inv[itemId]) return false;

        inv[itemId] -= count;
        if (inv[itemId] <= 0) delete inv[itemId];

        await execute('UPDATE users SET inventory = ? WHERE id = ?', [JSON.stringify(inv), userId]);
        return true;
    } catch (error) {
        console.error(`Error in removeGlobalItem for user ${userId}, item ${itemId}:`, error);
        throw error;
    }
}

async function isOwner(userId) {
    return process.env.OWNER_ID === userId;
}

async function getRandomUserByJob(jobId, excludeIds = []) {
    try {
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
    } catch (error) {
        console.error(`Error in getRandomUserByJob for job ${jobId}:`, error);
        throw error;
    }
}

async function getUserCount() {
    try {
        const row = await queryOne('SELECT COUNT(*) as count FROM users');
        return row ? Number(row.count) : 0;
    } catch (error) {
        console.error('Error in getUserCount:', error);
        throw error;
    }
}

async function resetUser(userId) {
    try {
        await execute('DELETE FROM users WHERE id = ?', [userId]);
        await execute('DELETE FROM participants WHERE user_id = ?', [userId]);
        await execute('DELETE FROM lottery_tickets WHERE user_id = ?', [userId]);
        await execute('DELETE FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
    } catch (error) {
        console.error(`Error in resetUser for user ${userId}:`, error);
        throw error;
    }
}

async function addAllBalance(amount) {
    try {
        await execute('UPDATE users SET balance = balance + ?', [amount]);
    } catch (error) {
        console.error('Error in addAllBalance:', error);
        throw error;
    }
}

async function removeAllBalance(amount) {
    try {
        await execute('UPDATE users SET balance = GREATEST(0, balance - ?)', [amount]);
    } catch (error) {
        console.error('Error in removeAllBalance:', error);
        throw error;
    }
}

async function addAllLevel(amount) {
    try {
        const config = require('../config');
        const milestoneInterval = config.ECONOMY?.LEVELING?.MILESTONE_INTERVAL || 20;
        await execute(`
            UPDATE users 
            SET level = level + ?,
                xp = CAST(POWER((level + ?) / 0.1, 2) AS BIGINT),
                milestone_count = FLOOR((level + ?) / ?)
        `, [amount, amount, amount, milestoneInterval]);
    } catch (error) {
        console.error('Error in addAllLevel:', error);
        throw error;
    }
}

async function removeAllLevel(amount) {
    try {
        const config = require('../config');
        const milestoneInterval = config.ECONOMY?.LEVELING?.MILESTONE_INTERVAL || 20;
        await execute(`
            UPDATE users 
            SET level = GREATEST(0, level - ?),
                xp = CAST(POWER(GREATEST(0, level - ?) / 0.1, 2) AS BIGINT),
                milestone_count = FLOOR(GREATEST(0, level - ?) / ?)
        `, [amount, amount, amount, milestoneInterval]);
    } catch (error) {
        console.error('Error in removeAllLevel:', error);
        throw error;
    }
}

async function addBalance(guildId, userId, amount) {
    try {
        if (amount === undefined) {
            amount = userId;
            userId = guildId;
        }
        if (!userId) return;
        return await addGlobalBalance(userId, amount, guildId);
    } catch (error) {
        console.error(`Error in addBalance for user ${userId}:`, error);
        throw error;
    }
}

async function addItem(guildId, userId, itemId, count = 1) {
    try {
        let finalUserId = userId;
        let finalItemId = itemId;
        let finalCount = count;

        if (itemId === undefined || typeof userId === 'number') {
            finalUserId = guildId;
            finalItemId = userId;
            finalCount = itemId !== undefined ? itemId : count;
        }

        if (!finalUserId || !finalItemId) return;
        return await addGlobalItem(finalUserId, finalItemId, finalCount);
    } catch (error) {
        console.error(`Error in addItem for user ${userId}, item ${itemId}:`, error);
        throw error;
    }
}

async function removeItem(guildId, userId, itemId, count = 1) {
    try {
        let finalUserId = userId;
        let finalItemId = itemId;
        let finalCount = count;

        if (itemId === undefined || typeof userId === 'number') {
            finalUserId = guildId;
            finalItemId = userId;
            finalCount = itemId !== undefined ? itemId : count;
        }

        if (!finalUserId || !finalItemId) return false;
        return await removeGlobalItem(finalUserId, finalItemId, finalCount);
    } catch (error) {
        console.error(`Error in removeItem for user ${userId}, item ${itemId}:`, error);
        throw error;
    }
}

async function removeBalance(guildId, userId, amount) {
    try {
        if (amount === undefined) {
            amount = userId;
            userId = guildId;
        }
        if (!userId) return;
        return await removeGlobalBalance(userId, amount, guildId);
    } catch (error) {
        console.error(`Error in removeBalance for user ${userId}:`, error);
        throw error;
    }
}

async function updateUser(guildId, userId, updates) {
    try {
        if (updates === undefined) {
            updates = userId;
            userId = guildId;
        }
        if (!userId) return;
        return await updateGlobalUser(userId, updates, guildId);
    } catch (error) {
        console.error(`Error in updateUser for user ${userId}:`, error);
        throw error;
    }
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
    addItem,
    addGlobalXp,
    setGlobalLevel,
    removeGlobalBalance,
    removeBalance,
    removeItem,
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
