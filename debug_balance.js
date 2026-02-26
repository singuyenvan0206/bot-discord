
const db = require('./src/database');
const { addXp } = require('./src/utils/leveling');

async function test() {
    await db.getDb();

    const userId = 'DEBUG_USER_' + Date.now();
    const user = db.getUser(userId);
    console.log('Initial User:', user);

    console.log('--- Adding 14 XP ---');
    addXp(userId, 14);

    const updatedUser = db.getUser(userId);
    console.log('Updated User:', updatedUser);

    if (updatedUser.balance > 0) {
        console.log('!!! LEAK DETECTED !!! Balance increased by:', updatedUser.balance);
    } else {
        console.log('No leak detected.');
    }
}

test();
