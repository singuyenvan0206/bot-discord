const { execute, queryAll, queryOne } = require('./pool');

async function incrementEmojiUsage(guildId, emojiId) {
    try {
        const now = Date.now();
        await execute(`
            INSERT INTO emoji_stats (guild_id, emoji_id, use_count, last_used_at)
            VALUES (?, ?, 1, ?)
            ON CONFLICT(guild_id, emoji_id) DO UPDATE SET
                use_count = emoji_stats.use_count + 1,
                last_used_at = EXCLUDED.last_used_at
        `, [guildId, emojiId, now]);
    } catch (error) {
        console.error(`Error in incrementEmojiUsage for guild ${guildId}, emoji ${emojiId}:`, error);
    }
}

async function getEmojiStats(guildId) {
    try {
        return await queryAll('SELECT * FROM emoji_stats WHERE guild_id = ?', [guildId]);
    } catch (error) {
        console.error(`Error in getEmojiStats for guild ${guildId}:`, error);
        return [];
    }
}

async function clearEmojiStats(guildId, emojiId) {
    try {
        await execute('DELETE FROM emoji_stats WHERE guild_id = ? AND emoji_id = ?', [guildId, emojiId]);
    } catch (error) {
        console.error(`Error in clearEmojiStats for guild ${guildId}, emoji ${emojiId}:`, error);
    }
}

async function updateEmojiHash(guildId, emojiId, hash) {
    try {
        const now = Date.now();
        await execute(`
            INSERT INTO emoji_stats (guild_id, emoji_id, image_hash, last_used_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, emoji_id) DO UPDATE SET
                image_hash = EXCLUDED.image_hash
        `, [guildId, emojiId, hash, now]);
    } catch (error) {
        console.error(`Error in updateEmojiHash for guild ${guildId}, emoji ${emojiId}:`, error);
    }
}

async function getEmojiHashes(guildId) {
    try {
        const rows = await queryAll('SELECT emoji_id, image_hash FROM emoji_stats WHERE guild_id = ? AND image_hash IS NOT NULL', [guildId]);
        return rows;
    } catch (error) {
        console.error(`Error in getEmojiHashes for guild ${guildId}:`, error);
        return [];
    }
}

module.exports = {
    incrementEmojiUsage,
    getEmojiStats,
    clearEmojiStats,
    updateEmojiHash,
    getEmojiHashes,
};
