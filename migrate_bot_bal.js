const db = require('./src/database');

async function fix() {
    try {
        const guildId = '842019145020997679'; // The guild we saw in previous runs
        const botId = '479275782670254081'; // The suspected bot ID

        console.log(`Checking bot balance for ${botId} in users table...`);
        const botUser = await db.queryOne('SELECT balance FROM users WHERE id = ?', [botId]);
        
        if (botUser && botUser.balance > 0) {
            console.log(`Found ${botUser.balance} coins in users table for bot.`);
            console.log(`Migrating to guild ${guildId} bot_balance setting...`);
            
            const currentGuildBal = await db.getGuildSetting(guildId, 'bot_balance', 0);
            await db.setGuildSetting(guildId, 'bot_balance', Number(currentGuildBal) + Number(botUser.balance));
            
            console.log(`Resetting bot balance in users table...`);
            await db.execute('UPDATE users SET balance = 0 WHERE id = ?', [botId]);
            
            console.log(`✅ Migration complete.`);
        } else {
            console.log(`No balance found for bot in users table (or ID incorrect).`);
        }

        // Force a check of distribution window
        const lastDist = await db.getGuildSetting(guildId, 'last_house_distribution', '0');
        console.log(`Current last_house_distribution: ${lastDist}`);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
