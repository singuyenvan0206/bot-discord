const db = require('../database');

/**
 * Manually starts a cooldown for a user on a specific command via Redis.
 * @param {import('discord.js').Client} client 
 * @param {string} commandName 
 * @param {string} userId 
 */
async function startCooldown(client, commandName, userId) {
    const command = client.commands.get(commandName);
    if (!command) return;

    const now = Date.now();
    const cooldownAmountMs = (command.cooldown || 3) * 1000;
    const cooldownKey = `cooldown:${commandName}:${userId}`;

    await db.redisClient.setEx(cooldownKey, Math.ceil(cooldownAmountMs / 1000), now.toString());
}

module.exports = { startCooldown };
