const db = require('./src/database');

async function migrate() {
    process.env.DB_NAME = 'databases.db';
    await db.getDb();

    const oldBotId = '1340176846143094895';
    const newBotId = '1473584982135144489';

    console.log(`--- Data Migration ---`);
    console.log(`From: ${oldBotId}`);
    console.log(`To:   ${newBotId}`);

    const oldUser = db.getUser(oldBotId);
    const newUser = db.getUser(newBotId);

    console.log(`Old Bot Balance: ${oldUser.balance}, XP: ${oldUser.xp}`);
    console.log(`New Bot Balance: ${newUser.balance}, XP: ${newUser.xp}`);

    if (oldUser.balance > 0 || oldUser.xp > 0) {
        console.log('\nMigrating...');

        // Add old to new
        db.addBalance(newBotId, oldUser.balance);
        db.updateUser(newBotId, {
            xp: (newUser.xp || 0) + (oldUser.xp || 0),
            level: Math.floor(0.1 * Math.sqrt((newUser.xp || 0) + (oldUser.xp || 0)))
        });

        // Clear old
        db.updateUser(oldBotId, { balance: 0, xp: 0, level: 0 });

        const finalNew = db.getUser(newBotId);
        console.log(`Final New Bot: Balance=${finalNew.balance}, XP=${finalNew.xp}, Level=${finalNew.level}`);
        console.log('✅ Migration complete.');
    } else {
        console.log('❌ Nothing to migrate from old bot ID.');
    }

    process.exit(0);
}

migrate();
