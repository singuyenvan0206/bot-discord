require('dotenv').config();
const db = require('./src/database');
const { addHouseProfit } = require('./src/utils/economy');

async function test() {
    console.log('🚀 Testing Bot Balance Separation...');
    try {
        await db.getDb();
        const guildA = 'guild_A';
        const guildB = 'guild_B';
        const botId = 'bot_id_123';
        
        await db.setBotId(botId);
        console.log(`Bot ID set: ${global.botId}`);

        // Mock a profit in Guild A
        console.log('\n--- Adding 1000 profit to Guild A ---');
        await addHouseProfit({ guild: { id: guildA }, client: { user: { id: botId } } }, 1000);
        
        // Mock a profit in Guild B
        console.log('--- Adding 2000 profit to Guild B ---');
        await addHouseProfit({ guild: { id: guildB }, client: { user: { id: botId } } }, 2000);

        const balA = await db.getGuildSetting(guildA, 'bot_balance', 0);
        const balB = await db.getGuildSetting(guildB, 'bot_balance', 0);
        
        console.log(`\nGuild A Bot Balance: ${balA}`);
        console.log(`Guild B Bot Balance: ${balB}`);

        if (balA !== balB && balA === 400 && balB === 800) { // 40% retention of 1000 and 2000
            console.log('\n✅ SUCCESS: Balances are separated and correctly calculated!');
        } else {
            console.log('\n❌ FAILURE: Balances might be shared or incorrect.');
        }

        // Check if there's any record in users table for the bot
        const botInUsers = await db.queryOne('SELECT balance FROM users WHERE id = ?', [botId]);
        if (botInUsers && Number(botInUsers.balance) > 0) {
            console.log(`❌ FAILURE: Bot has a balance of ${botInUsers.balance} in the global users table!`);
        } else {
            console.log('✅ SUCCESS: Bot has no global balance in users table.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
test();
