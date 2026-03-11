const { execute, queryAll, queryOne, pool } = require('./pool');

async function getGuild(guildId) {
    let guild = await queryOne('SELECT * FROM guilds WHERE id = ?', [guildId]);
    if (!guild) {
        await execute('INSERT INTO guilds (id) VALUES (?) ON CONFLICT DO NOTHING', [guildId]);
        guild = { id: guildId, language: 'vi', prefix: null, json_data: '{}' };
    }
    return guild;
}

async function updateGuild(guildId, updates) {
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
}

async function getGuildSetting(guildId, key, defaultValue = null) {
    const row = await queryOne('SELECT value FROM guild_settings WHERE guild_id = ? AND key = ?', [guildId, key]);
    if (row) {
        const val = row.value;
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (!isNaN(val) && val.trim() !== '') return Number(val);
        return val;
    }
    return defaultValue;
}

async function setGuildSetting(guildId, key, value) {
    await execute(`
        INSERT INTO guild_settings (guild_id, key, value)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, key) DO UPDATE SET value = EXCLUDED.value
    `, [guildId, key, String(value)]);
}

async function addGuildRole(guildId, roleId, name, price, incomeBuff, xpBuff, color) {
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
}

async function removeGuildRole(guildId, roleId) {
    await execute('DELETE FROM guild_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
}

async function getGuildRoles(guildId) {
    return await queryAll('SELECT * FROM guild_roles WHERE guild_id = ? ORDER BY price ASC', [guildId]);
}

async function getGuildRole(guildId, roleId) {
    return await queryOne('SELECT * FROM guild_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
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
