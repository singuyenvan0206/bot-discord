const { execute, queryAll, queryOne, pool } = require('./pool');

async function getGuild(guildId) {
    try {
        let guild = await queryOne('SELECT * FROM guilds WHERE id = ?', [guildId]);
        if (!guild) {
            await execute('INSERT INTO guilds (id) VALUES (?) ON CONFLICT DO NOTHING', [guildId]);
            guild = { id: guildId, language: 'vi', prefix: null, json_data: '{}' };
        }
        return guild;
    } catch (error) {
        console.error(`Error in getGuild for guild ${guildId}:`, error);
        throw error;
    }
}

async function updateGuild(guildId, updates) {
    try {
        const fields = [];
        const values = [];
        let i = 1;
        Object.entries(updates).forEach(([key, value]) => {
            fields.push(`${key} = $${i++}`);
            values.push(value);
        });
        if (fields.length === 0) return;
        values.push(guildId);
        await pool.query(`UPDATE guilds SET ${fields.join(', ')} WHERE id = $${i}`, values);
    } catch (error) {
        console.error(`Error in updateGuild for guild ${guildId}:`, error);
        throw error;
    }
}

async function getGuildSetting(guildId, key, defaultValue = null) {
    try {
        const row = await queryOne('SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?', [guildId, key]);
        if (row) {
            const val = row.value;
            if (val === 'true') return true;
            if (val === 'false') return false;
            // Avoid converting long numeric strings (like Discord IDs) to numbers to prevent precision loss
            if (/^\d+$/.test(val) && val.length > 15) return val;
            if (!isNaN(val) && val.trim() !== '') return Number(val);
            return val;
        }
        return defaultValue;
    } catch (error) {
        console.error(`Error in getGuildSetting for guild ${guildId}, key ${key}:`, error);
        throw error;
    }
}

async function setGuildSetting(guildId, key, value) {
    try {
        await execute(`
            INSERT INTO guild_settings (guild_id, key, value)
            VALUES (?, ?, ?)
            ON CONFLICT(guild_id, key) DO UPDATE SET value = EXCLUDED.value
        `, [guildId, key, String(value)]);
    } catch (error) {
        console.error(`Error in setGuildSetting for guild ${guildId}, key ${key}:`, error);
        throw error;
    }
}

async function addGuildRole(guildId, roleId, name, price, incomeBuff, xpBuff, color) {
    try {
        await execute(`
            INSERT INTO guild_roles (guild_id, role_id, name, price, income_buff, xp_buff, color)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, role_id) DO UPDATE SET
                name = EXCLUDED.name,
                price = EXCLUDED.price,
                income_buff = EXCLUDED.income_buff,
                xp_buff = EXCLUDED.xp_buff,
                color = EXCLUDED.color
        `, [guildId, roleId, name, price, incomeBuff, xpBuff, color]);
    } catch (error) {
        console.error(`Error in addGuildRole for guild ${guildId}, role ${roleId}:`, error);
        throw error;
    }
}

async function removeGuildRole(guildId, roleId) {
    try {
        await execute('DELETE FROM guild_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
    } catch (error) {
        console.error(`Error in removeGuildRole for guild ${guildId}, role ${roleId}:`, error);
        throw error;
    }
}

async function getGuildRoles(guildId) {
    try {
        return await queryAll('SELECT * FROM guild_roles WHERE guild_id = ? ORDER BY price ASC', [guildId]);
    } catch (error) {
        console.error(`Error in getGuildRoles for guild ${guildId}:`, error);
        throw error;
    }
}

async function getGuildRole(guildId, roleId) {
    try {
        return await queryOne('SELECT * FROM guild_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
    } catch (error) {
        console.error(`Error in getGuildRole for guild ${guildId}, role ${roleId}:`, error);
        throw error;
    }
}

module.exports = {
    getGuild,
    updateGuild,
    getGuildSetting,
    setGuildSetting,
    addGuildRole,
    removeGuildRole,
    getGuildRoles,
    getGuildRole
};
