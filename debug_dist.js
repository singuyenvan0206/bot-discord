const db = require('./src/database');
const config = require('./src/config');

async function check() {
    try {
        const guilds = await db.queryAll('SELECT id FROM guilds');
        console.log(`--- Comprehensive Fund Check ---`);
        console.log(`Bot ID (global.botId): ${global.botId || 'NOT SET'}`);
        
        // Let's check the bot's own balance in the users table too (some bugs might cause it to accumulate there)
        const allUsers = await db.queryAll('SELECT id, balance FROM users');
        const botsInUsers = allUsers.filter(u => u.id.length > 15); // Long IDs are likely Discord IDs
        console.log(`\nPotential Bot/Human IDs in users table with balance > 0:`);
        botsInUsers.forEach(u => {
            if (u.balance > 0) console.log(` - ${u.id}: ${u.balance}`);
        });

        for (const g of guilds) {
            const balance = await db.getGuildSetting(g.id, 'bot_balance', 0);
            const distTime = await db.getGuildSetting(g.id, 'last_house_distribution', '0');
            console.log(`\nGuild ${g.id}:`);
            console.log(` - Fund: ${balance}`);
            console.log(` - Last Dist Time: ${distTime}`);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
