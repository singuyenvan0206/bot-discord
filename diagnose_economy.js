const db = require('./src/database');
const config = require('./src/config');

async function diagnose() {
    process.env.DB_NAME = 'databases.db';
    await db.getDb();

    console.log('--- Economy Diagnostic ---');

    const botId = '1473584982135144489';
    // Actually, I should find the bot ID from the DB or just check all users.

    const users = db.getTopUsers(100);
    console.log(`\n--- All Users (${users.length}) ---`);
    users.forEach(u => {
        console.log(`ID: ${u.id}`);
        console.log(`  Balance: ${u.balance}`);
        console.log(`  XP:      ${u.xp}`);
        console.log(`  Level:   ${u.level}`);
        console.log(`  Job:     ${u.job}`);
    });

    const lastDist = db.getGlobalSetting('last_house_distribution', '0');
    const now = Math.floor(Date.now() / 1000);
    const interval = config.ECONOMY.HOUSE_DISTRIBUTION_INTERVAL;

    console.log('\nDistribution Settings:');
    console.log(`- Last distribution: ${new Date(parseInt(lastDist) * 1000).toLocaleString()} (${lastDist})`);
    console.log(`- Current time:      ${new Date(now * 1000).toLocaleString()} (${now})`);
    console.log(`- Time since last:   ${now - lastDist} seconds`);
    console.log(`- Interval:          ${interval} seconds`);
    console.log(`- Due in:            ${interval - (now - lastDist)} seconds`);

    const houseMin = config.ECONOMY.HOUSE_DISTRIBUTION_MIN_POOL;
    console.log(`- Min pool required: ${houseMin}`);

    const userCount = db.getUserCount();
    console.log(`- Total users in DB:   ${userCount}`);

    // Check if any user has balance to see if it's working at all
    const totalCoins = userCount > 0 ? users.reduce((acc, u) => acc + u.balance, 0) : 0;
    console.log(`- Total coins in top 10: ${totalCoins}`);

    // Test XP and balance persistence
    console.log('\n--- Persistence Test ---');
    const testId = 'test_user_' + Date.now();
    console.log(`- Creating test user: ${testId}`);
    db.getUser(testId);
    db.addBalance(testId, 1234);
    const { addXp } = require('./src/utils/leveling');
    addXp(testId, 500);

    const verify = db.getUser(testId);
    console.log(`- Data after update: Balance=${verify.balance}, XP=${verify.xp}, Level=${verify.level}`);
    if (verify.balance === 1234 && verify.xp > 0) {
        console.log('✅ Update successful in-memory.');
    } else {
        console.log('❌ Update failed in-memory.');
    }

    // Test Distribution logic
    console.log('\n--- Distribution Test ---');
    const botIdToTest = '1340176846143094895';
    const beforeBal = db.getUser(botIdToTest).balance;
    console.log(`- Bot Balance before: ${beforeBal}`);

    // Distribute 1000 total (among 2 other users)
    const perUser = 500;
    console.log(`- Distributing ${perUser} to others...`);
    db.distributeBalanceToAll(perUser, botIdToTest);

    const afterBal = db.getUser(botIdToTest).balance;
    console.log(`- Bot Balance after:  ${afterBal}`);
    if (afterBal === 0) {
        console.log('✅ Distribution reset bot balance correctly.');
    } else {
        console.log('❌ Distribution FAILED to reset bot balance!!');
    }

    process.exit(0);
}

diagnose();
