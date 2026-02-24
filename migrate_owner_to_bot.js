const db = require('./src/database');

async function migrate() {
    process.env.DB_NAME = 'databases.db';
    await db.getDb();

    const ownerId = '765577989663883364';
    const botId = '1473584982135144489';

    console.log(`--- Owner to Bot Migration ---`);
    const owner = db.getUser(ownerId);
    const bot = db.getUser(botId);

    console.log(`Owner Balance: ${owner.balance}, XP: ${owner.xp}`);
    console.log(`Bot   Balance: ${bot.balance}, XP: ${bot.xp}`);

    if (owner.balance > 1000000) { // Only if they have over 1M, assuming they are acting as the house
        console.log('\nMigrating house funds to bot...');

        db.addBalance(botId, owner.balance);
        db.updateUser(botId, {
            xp: (bot.xp || 0) + (owner.xp || 0),
            level: Math.floor(0.1 * Math.sqrt((bot.xp || 0) + (owner.xp || 0)))
        });

        // Clear owner (of these specifically massive amounts)
        db.updateUser(ownerId, { balance: 0, xp: 0, level: 0 });

        const finalBot = db.getUser(botId);
        console.log(`Final Bot: Balance=${finalBot.balance}, XP=${finalBot.xp}`);
        console.log('✅ Migration successful.');
    } else {
        console.log('❌ Owner does not have massive surplus or already migrated.');
    }

    process.exit(0);
}

migrate();
