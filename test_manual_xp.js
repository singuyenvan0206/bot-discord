const db = require('./src/database');
const { addXp } = require('./src/utils/leveling');

async function test() {
    process.env.DB_NAME = 'databases.db';
    await db.getDb();

    const target = '999890605969588265';
    console.log(`Checking user ${target}...`);
    const before = db.getUser(target);
    console.log(`Before: XP=${before.xp}`);

    console.log('Adding 1000 XP (base)...');
    addXp(target, 1000); // Should become 3000 with 3x multiplier

    const after = db.getUser(target);
    console.log(`After: XP=${after.xp}`);

    process.exit(0);
}

test();
