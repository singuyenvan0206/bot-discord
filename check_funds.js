const db = require('./src/database');

async function check() {
    try {
        const guilds = await db.queryAll('SELECT id FROM guilds');
        console.log(`Checking ${guilds.length} guilds...`);

        for (const g of guilds) {
            const balance = await db.getGuildSetting(g.id, 'bot_balance', 0);
            const lastWindow = await db.getGuildSetting(g.id, 'last_house_distribution_window', 'N/A');
            const lastTime = await db.getGuildSetting(g.id, 'last_house_distribution', 'N/A');
            
            console.log(`Guild: ${g.id}`);
            console.log(` - Bot Fund Balance: ${balance}`);
            console.log(` - Last Distribution Window: ${lastWindow}`);
            console.log(` - Last Distribution Timestamp: ${lastTime}`);
            
            const users = await db.getTopUsers(g.id, 5, 'balance');
            console.log(` - Top users in guild: ${users.map(u => u.id).join(', ')}`);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
