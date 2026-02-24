const db = require('./src/database');
const { addHouseProfit } = require('./src/utils/economy');

async function test() {
    process.env.DB_NAME = 'databases.db';
    await db.getDb();

    const mockBotId = 'TEST_BOT_ID_' + Date.now();
    const mockClient = {
        user: { id: mockBotId }
    };

    console.log(`Adding 1000 profit to ${mockBotId}...`);
    addHouseProfit(mockClient, 1000);

    const u = db.getUser(mockBotId);
    console.log(`Bot Result: Balance=${u.balance}, XP=${u.xp}`);

    if (u.balance === 1000) {
        console.log('✅ addHouseProfit works correctly for a mock client.');
    } else {
        console.log('❌ addHouseProfit FAILED to credit the correct ID.');
    }

    process.exit(0);
}

test();
