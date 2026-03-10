const db = require('../database');
const { Collection } = require('discord.js');

/**
 * Manually starts a cooldown for a user on a specific command.
 * @param {import('discord.js').Client} client 
 * @param {string} commandName 
 * @param {string} userId 
 */
function startCooldown(client, commandName, userId) {
    const command = client.commands.get(commandName);
    if (!command) return;

    if (!client.cooldowns.has(commandName)) {
        client.cooldowns.set(commandName, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(commandName);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownAmount);
}

/**
 * Resets all cooldowns for a specific user across all commands.
 * @param {import('discord.js').Client} client 
 * @param {string} userId 
 */
function resetCooldowns(client, userId) {
    if (!client.cooldowns) return;

    // Clear individual command cooldowns
    for (const [commandName, timestamps] of client.cooldowns) {
        if (timestamps.has(userId)) {
            timestamps.delete(userId);
        }
    }

    // Clear anti-spam tracking
    if (client.spamTrack && client.spamTrack.has(userId)) {
        client.spamTrack.set(userId, []);
    }
}

module.exports = { startCooldown, resetCooldowns };
