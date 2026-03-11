const db = require('./src/database');
const config = require('./src/config');

async function testPerServerStats() {
    try {
        console.log('--- Initializing Test ---');
        await db.initSchema(); 
        
        const userId = 'verify_user_999';
        const guild1 = 'server_x';
        const guild2 = 'server_y';

        // Cleanup
        await db.execute('DELETE FROM user_guilds WHERE userId = ?', [userId]);
        await db.execute('DELETE FROM users WHERE id = ?', [userId]);

        console.log('--- Phase 1: Global Mode (Default) ---');
        config.ECONOMY.PER_SERVER_STATS = false;
        
        await db.addBalance(guild1, userId, 1000);
        let userG1 = await db.getUser(userId, guild1);
        let userG2 = await db.getUser(userId, guild2);
        
        console.log(`Global Server X Balance: ${userG1.balance}`);
        console.log(`Global Server Y Balance: ${userG2.balance}`);
        
        if (userG1.balance === 1000 && userG2.balance === 1000) {
            console.log('RESULT: GLOBAL_PASS');
        } else {
            console.log('RESULT: GLOBAL_FAIL');
        }

        console.log('\n--- Phase 2: Per-Server Mode ---');
        config.ECONOMY.PER_SERVER_STATS = true;
        
        await db.addBalance(guild1, userId, 500);
        await db.addBalance(guild2, userId, 200);
        
        userG1 = await db.getUser(userId, guild1);
        userG2 = await db.getUser(userId, guild2);
        
        console.log(`Per-Server X Balance: ${userG1.balance}`);
        console.log(`Per-Server Y Balance: ${userG2.balance}`);
        
        if (userG1.balance === 500 && userG2.balance === 200) {
            console.log('RESULT: BALANCE_ISO_PASS');
        } else {
            console.log('RESULT: BALANCE_ISO_FAIL');
        }

        console.log('\n--- Phase 3: XP Isolation ---');
        await db.addGlobalXp(userId, 100, guild1);
        await db.addGlobalXp(userId, 300, guild2);
        
        userG1 = await db.getUser(userId, guild1);
        userG2 = await db.getUser(userId, guild2);
        
        console.log(`Per-Server X XP: ${userG1.xp}`);
        console.log(`Per-Server Y XP: ${userG2.xp}`);
        
        if (userG1.xp === 100 && userG2.xp === 300) {
            console.log('RESULT: XP_ISO_PASS');
        } else {
            console.log('RESULT: XP_ISO_FAIL');
        }

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        process.exit();
    }
}

testPerServerStats();
