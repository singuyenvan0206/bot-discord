const { pool, execute, queryAll, queryOne } = require('./pool');

async function createGiveaway({ guildId, channelId, messageId, hostId, prize, description, winnerCount, requiredRoleId, endsAt, scheduledStart }) {
    const res = await pool.query(
        `INSERT INTO giveaways (guild_id, channel_id, message_id, host_id, prize, description, winner_count, required_role_id, ends_at, scheduled_start)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [guildId, channelId, messageId, hostId, prize, description || null, winnerCount, requiredRoleId || null, endsAt, scheduledStart || null]
    );
    return res.rows[0].id;
}

async function getGiveaway(messageId) {
    return await queryOne('SELECT * FROM giveaways WHERE message_id = ?', [messageId]);
}

async function getGiveawayById(id) {
    return await queryOne('SELECT * FROM giveaways WHERE id = ?', [id]);
}

async function getActiveGiveaways(guildId) {
    const now = Math.floor(Date.now() / 1000);
    if (guildId) {
        return await queryAll('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 AND (scheduled_start IS NULL OR scheduled_start <= ?) ORDER BY ends_at ASC', [guildId, now]);
    }
    return await queryAll('SELECT * FROM giveaways WHERE ended = 0 AND (scheduled_start IS NULL OR scheduled_start <= ?) ORDER BY ends_at ASC', [now]);
}

async function getExpiredGiveaways() {
    const now = Math.floor(Date.now() / 1000);
    return await queryAll('SELECT * FROM giveaways WHERE ended = 0 AND paused = 0 AND ends_at <= ? AND (scheduled_start IS NULL OR scheduled_start <= ?)', [now, now]);
}

async function getScheduledGiveaways() {
    const now = Math.floor(Date.now() / 1000);
    return await queryAll('SELECT * FROM giveaways WHERE ended = 0 AND scheduled_start IS NOT NULL AND scheduled_start <= ? AND message_id IS NULL', [now]);
}

async function endGiveaway(messageId) {
    await execute('UPDATE giveaways SET ended = 1 WHERE message_id = ?', [messageId]);
}

async function pauseGiveaway(messageId) {
    await execute('UPDATE giveaways SET paused = 1 WHERE message_id = ?', [messageId]);
}

async function resumeGiveaway(messageId) {
    await execute('UPDATE giveaways SET paused = 0 WHERE message_id = ?', [messageId]);
}

async function updateGiveaway(messageId, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    if (updates.prize !== undefined) { fields.push(`prize = $${i++}`); values.push(updates.prize); }
    if (updates.description !== undefined) { fields.push(`description = $${i++}`); values.push(updates.description); }
    if (updates.winnerCount !== undefined) { fields.push(`winner_count = $${i++}`); values.push(updates.winnerCount); }
    if (updates.endsAt !== undefined) { fields.push(`ends_at = $${i++}`); values.push(updates.endsAt); }
    if (updates.scheduledStart !== undefined) { fields.push(`scheduled_start = $${i++}`); values.push(updates.scheduledStart); }
    if (updates.paused !== undefined) { fields.push(`paused = $${i++}`); values.push(updates.paused ? 1 : 0); }
    if (fields.length === 0) return;
    values.push(messageId);
    await pool.query(`UPDATE giveaways SET ${fields.join(', ')} WHERE message_id = $${i}`, values);
}

async function deleteGiveaway(messageId) {
    await execute('DELETE FROM giveaways WHERE message_id = ?', [messageId]);
}

async function addParticipant(giveawayId, userId) {
    try {
        await execute('INSERT INTO participants (giveaway_id, user_id) VALUES (?, ?) ON CONFLICT(giveaway_id, user_id) DO NOTHING', [giveawayId, userId]);
    } catch (e) { }
}

async function removeParticipant(giveawayId, userId) {
    await execute('DELETE FROM participants WHERE giveaway_id = ? AND user_id = ?', [giveawayId, userId]);
}

async function getParticipants(giveawayId) {
    return await queryAll('SELECT user_id, bonus_entries FROM participants WHERE giveaway_id = ?', [giveawayId]);
}

async function getParticipantUserIds(giveawayId) {
    const rows = await queryAll('SELECT user_id FROM participants WHERE giveaway_id = ?', [giveawayId]);
    return rows.map(r => r.user_id);
}

async function getParticipantCount(giveawayId) {
    const row = await queryOne('SELECT COUNT(*) as count FROM participants WHERE giveaway_id = ?', [giveawayId]);
    return row ? Number(row.count) : 0;
}

async function getTotalEntries(giveawayId) {
    const row = await queryOne('SELECT COUNT(*) + COALESCE(SUM(bonus_entries), 0) as total FROM participants WHERE giveaway_id = ?', [giveawayId]);
    return row ? Number(row.total) : 0;
}

async function addBonusEntry(giveawayId, userId, count = 1) {
    await execute('INSERT INTO participants (giveaway_id, user_id) VALUES (?, ?) ON CONFLICT(giveaway_id, user_id) DO NOTHING', [giveawayId, userId]);
    await execute('UPDATE participants SET bonus_entries = bonus_entries + ? WHERE giveaway_id = ? AND user_id = ?', [count, giveawayId, userId]);
}

async function getBonusEntries(giveawayId, userId) {
    const row = await queryOne('SELECT bonus_entries FROM participants WHERE giveaway_id = ? AND user_id = ?', [giveawayId, userId]);
    return row ? row.bonus_entries : 0;
}

module.exports = {
    createGiveaway,
    getGiveaway,
    getGiveawayById,
    getActiveGiveaways,
    getExpiredGiveaways,
    getScheduledGiveaways,
    endGiveaway,
    pauseGiveaway,
    resumeGiveaway,
    updateGiveaway,
    deleteGiveaway,
    addParticipant,
    removeParticipant,
    getParticipants,
    getParticipantUserIds,
    getParticipantCount,
    getTotalEntries,
    addBonusEntry,
    getBonusEntries
};
