const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');

const { isManager } = require('../../utils/permissions');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

// Module-level Map: channelId → collector (game runs independently per channel)
const activeGames = new Map();

/**
 * NOTE: This command has been moved to a standalone script: src/wordchain_standalone.js
 * To run it, use: node src/wordchain_standalone.js
 */
/*
module.exports = {
    name: 'wordchain',
    ...
};
*/
