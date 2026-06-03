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

module.exports = {
    incrementEmojiUsage,
    getEmojiStats,
    clearEmojiStats,
};
