const { Events, ActivityType } = require('discord.js');
const db = require('../database');
const { startTimer } = require('../utils/timer');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('');
        console.log('╔══════════════════════════════════════════════╗');
        console.log('║     🎉  Giveaway Bot is Online!  🎉         ║');
        console.log('╠══════════════════════════════════════════════╣');
        console.log(`║  Logged in as: ${client.user.tag.padEnd(29)}║`);
        console.log(`║  Servers:      ${String(client.guilds.cache.size).padEnd(29)}║`);
        console.log('╚══════════════════════════════════════════════╝');
        console.log('');

        await db.getDb();
        console.log('💾 Database initialized');

        startTimer(client);

        client.user.setActivity(`/help | /giveaway`, { type: ActivityType.Listening });
    },
};
