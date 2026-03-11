const { execute, queryAll, queryOne } = require('./pool');
const { getGuildSetting, setGuildSetting } = require('./guilds');

// ─── Lottery ───────────────────────────────────────────────

async function addLotteryTicket(guildId, userId, count = 1) {
    try {
        guildId = guildId || 'global';
        await execute('INSERT INTO lottery_tickets (guild_id, user_id, count) VALUES (?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET count = lottery_tickets.count + EXCLUDED.count', [guildId, userId, count]);
    } catch (error) {
        console.error(`Error in addLotteryTicket for user ${userId}:`, error);
        throw error;
    }
}

async function getLotteryTickets(guildId) {
    try {
        guildId = guildId || 'global';
        return await queryAll('SELECT * FROM lottery_tickets WHERE guild_id = ?', [guildId]);
    } catch (error) {
        console.error(`Error in getLotteryTickets for guild ${guildId}:`, error);
        throw error;
    }
}

async function clearLotteryTickets(guildId) {
    try {
        guildId = guildId || 'global';
        await execute('DELETE FROM lottery_tickets WHERE guild_id = ?', [guildId]);
    } catch (error) {
        console.error(`Error in clearLotteryTickets for guild ${guildId}:`, error);
        throw error;
    }
}

async function getLotteryJackpot(guildId) {
    try {
        const val = guildId ? await getGuildSetting(guildId, 'lottery_jackpot') : await getGlobalSetting('lottery_jackpot');
        if (!val) {
            const config = require('../config');
            if (guildId) await setGuildSetting(guildId, 'lottery_jackpot', config.ECONOMY.LOTTERY.INITIAL_JACKPOT);
            else await setGlobalSetting('lottery_jackpot', config.ECONOMY.LOTTERY.INITIAL_JACKPOT.toString());
            return config.ECONOMY.LOTTERY.INITIAL_JACKPOT;
        }
        return parseInt(val);
    } catch (error) {
        console.error(`Error in getLotteryJackpot for guild ${guildId}:`, error);
        throw error;
    }
}

async function addLotteryJackpot(guildId, amount) {
    try {
        const current = await getLotteryJackpot(guildId);
        if (!guildId) await setGlobalSetting('lottery_jackpot', (current + amount).toString());
        else await setGuildSetting(guildId, 'lottery_jackpot', (current + amount));
    } catch (error) {
        console.error(`Error in addLotteryJackpot for guild ${guildId}:`, error);
        throw error;
    }
}

async function setLotteryJackpot(guildId, amount) {
    try {
        if (!guildId) await setGlobalSetting('lottery_jackpot', amount.toString());
        else await setGuildSetting(guildId, 'lottery_jackpot', amount);
    } catch (error) {
        console.error(`Error in setLotteryJackpot for guild ${guildId}:`, error);
        throw error;
    }
}

// ─── Businesses ──────────────────────────────────────────────

async function getUserBusinesses(userId) {
    try {
        return await queryAll('SELECT * FROM user_businesses WHERE user_id = ?', [userId]);
    } catch (error) {
        console.error(`Error in getUserBusinesses for user ${userId}:`, error);
        throw error;
    }
}

async function addUserBusiness(userId, businessId) {
    try {
        await execute('INSERT INTO user_businesses (user_id, business_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [userId, businessId]);
    } catch (error) {
        console.error(`Error in addUserBusiness for user ${userId}, business ${businessId}:`, error);
        throw error;
    }
}

async function updateUserBusiness(userId, businessId, updates) {
    try {
        const fields = [];
        const values = [];
        Object.entries(updates).forEach(([key, value]) => {
            fields.push(`${key} = ?`);
            values.push(value);
        });
        if (fields.length === 0) return;
        values.push(userId, businessId);
        await execute(`UPDATE user_businesses SET ${fields.join(', ')} WHERE user_id = ? AND business_id = ?`, values);
    } catch (error) {
        console.error(`Error in updateUserBusiness for user ${userId}, business ${businessId}:`, error);
        throw error;
    }
}

async function getAllUserBusinesses() {
    try {
        return await queryAll('SELECT * FROM user_businesses');
    } catch (error) {
        console.error('Error in getAllUserBusinesses:', error);
        throw error;
    }
}

async function removeAllUserBusinesses(userId) {
    try {
        await execute('DELETE FROM user_businesses WHERE user_id = ?', [userId]);
    } catch (error) {
        console.error(`Error in removeAllUserBusinesses for user ${userId}:`, error);
        throw error;
    }
}

async function transferUserBusiness(fromUserId, toUserId, businessId) {
    try {
        await execute('UPDATE user_businesses SET user_id = ? WHERE user_id = ? AND business_id = ?', [toUserId, fromUserId, businessId]);
    } catch (error) {
        console.error(`Error in transferUserBusiness from ${fromUserId} to ${toUserId}:`, error);
        throw error;
    }
}

// ─── Global Settings (Moved here or to guilds.js) ───

async function getGlobalSetting(key, defaultValue = null) {
    try {
        const row = await queryOne('SELECT value FROM global_settings WHERE key = ?', [key]);
        return row ? row.value : defaultValue;
    } catch (error) {
        console.error(`Error in getGlobalSetting for key ${key}:`, error);
        throw error;
    }
}

async function setGlobalSetting(key, value) {
    try {
        await execute(`
            INSERT INTO global_settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
        `, [key, String(value)]);
    } catch (error) {
        console.error(`Error in setGlobalSetting for key ${key}:`, error);
        throw error;
    }
}

module.exports = {
    addLotteryTicket,
    getLotteryTickets,
    clearLotteryTickets,
    getLotteryJackpot,
    addLotteryJackpot,
    setLotteryJackpot,
    getUserBusinesses,
    addUserBusiness,
    updateUserBusiness,
    getAllUserBusinesses,
    removeAllUserBusinesses,
    transferUserBusiness,
    getGlobalSetting,
    setGlobalSetting
};
