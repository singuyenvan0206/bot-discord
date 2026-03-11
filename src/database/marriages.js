const { execute, queryOne } = require('./pool');

async function getMarriage(guildId, userId) {
    if (!guildId) return await queryOne('SELECT * FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
    return await queryOne('SELECT * FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)', [guildId, userId, userId]);
}

async function createMarriage(guildId, user1Id, user2Id, ringId = 701) {
    const [u1, u2] = [user1Id, user2Id].sort();
    if (!guildId) {
        await execute('INSERT INTO marriages (user1_id, user2_id, ring_id) VALUES (?, ?, ?)', [u1, u2, ringId]);
        return;
    }
    await execute('INSERT INTO marriages (guild_id, user1_id, user2_id, ring_id) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', [guildId, u1, u2, ringId]);
}

async function deleteMarriage(guildId, userId) {
    if (!guildId) {
        await execute('DELETE FROM marriages WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
        return;
    }
    await execute('DELETE FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)', [guildId, userId, userId]);
}

module.exports = {
    getMarriage,
    createMarriage,
    deleteMarriage
};
