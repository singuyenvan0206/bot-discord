const pool = require('./pool');
const schema = require('./schema');
const users = require('./users');
const guilds = require('./guilds');
const giveaways = require('./giveaways');
const marriages = require('./marriages');
const economy = require('./economy');

module.exports = {
    ...pool,
    ...schema,
    ...users,
    ...guilds,
    ...giveaways,
    ...marriages,
    ...economy,

    // Re-export specific common aliases if needed
    getDb: async () => pool.pool,
    saveDb: async () => true, // Legacy support

    // Cross-module complex logic
    distributeBalanceRandomly: async (totalAmount, excludeUserId = null, guildId = null) => {
        if (totalAmount <= 0) return [];
        const config = require('../config');
        const perServer = config.ECONOMY?.PER_SERVER_STATS;

        let targets = [];
        if (guildId) {
            if (perServer) {
                targets = await pool.queryAll(`
                    SELECT user_guilds.userId as id, user_guilds.balance 
                    FROM user_guilds 
                    WHERE user_guilds.guildId = $1 ${excludeUserId ? 'AND user_guilds.userId != $2' : ''}
                `, excludeUserId ? [guildId, excludeUserId] : [guildId]);
            } else {
                targets = await pool.queryAll(`
                    SELECT users.id, users.balance 
                    FROM users 
                    JOIN user_guilds ON users.id = user_guilds.userId 
                    WHERE user_guilds.guildId = $1 ${excludeUserId ? 'AND users.id != $2' : ''}
                `, excludeUserId ? [guildId, excludeUserId] : [guildId]);
            }
        } else {
            targets = await pool.queryAll('SELECT id, balance FROM users' + (excludeUserId ? ' WHERE id != $1' : ''), excludeUserId ? [excludeUserId] : []);
        }

        if (targets.length === 0) return [];

        let weights = targets.map(u => {
            const balance = Math.max(0, Number(u.balance) || 0);
            const wealthFactor = Math.log10(balance + 100);
            const randomFactor = 0.5 + Math.random();
            return randomFactor / wealthFactor;
        });

        let totalWeight = weights.reduce((a, b) => a + b, 0);
        if (totalWeight === 0) totalWeight = 1;

        let distributed = 0;
        const results = [];

        for (const user of targets) {
            await pool.execute('UPDATE users SET last_dist_amount = 0 WHERE id = ?', [user.id]);
        }

        for (let i = 0; i < targets.length; i++) {
            const user = targets[i];
            let amount = 0;
            if (i === targets.length - 1) {
                amount = totalAmount - distributed;
            } else {
                amount = Math.floor((weights[i] / totalWeight) * totalAmount);
                distributed += amount;
            }
            if (amount > 0) {
                if (guildId && perServer) {
                    await pool.execute('UPDATE user_guilds SET balance = balance + ? WHERE userId = ? AND guildId = ?', [amount, user.id, guildId]);
                } else {
                    await pool.execute('UPDATE users SET balance = balance + ?, last_dist_amount = ? WHERE id = ?', [amount, amount, user.id]);
                }
                // Always record last_dist_amount in users table for global tracking if needed, or just users
                if (!(guildId && perServer)) {
                    // already updated above
                } else {
                    await pool.execute('UPDATE users SET last_dist_amount = ? WHERE id = ?', [amount, user.id]);
                }
                results.push({ userId: user.id, amount });
            }
        }
        return results;
    },

    clearAllData: async () => {
        await pool.execute('TRUNCATE TABLE users CASCADE');
        await pool.execute('TRUNCATE TABLE giveaways CASCADE');
        await pool.execute('TRUNCATE TABLE participants CASCADE');
        await pool.execute('TRUNCATE TABLE guilds CASCADE');
        await pool.execute('TRUNCATE TABLE global_settings CASCADE');
        await pool.execute('TRUNCATE TABLE marriages CASCADE');
        await pool.execute('TRUNCATE TABLE user_guilds CASCADE');
        await pool.execute('TRUNCATE TABLE guild_roles CASCADE');
        await pool.execute('TRUNCATE TABLE guild_settings CASCADE');
        await pool.execute('TRUNCATE TABLE lottery_tickets CASCADE');
        await pool.execute('TRUNCATE TABLE user_businesses CASCADE');
    }
};
