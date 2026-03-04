const db = require('./src/database');
const { calculateReward, getJobMilestoneBonus } = require('./src/utils/multiplier');

async function test() {
    const userId = 'TEST_USER_999';
    const guildId = 'TEST_GUILD_999';

    console.log('--- Phase 1: Database Setup ---');
    // Ensure table has the column (migration should have run, but let's be safe in test)
    await db.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS milestone_count INTEGER DEFAULT 0`);

    await db.pool.query('DELETE FROM users WHERE user_id = $1 AND guild_id = $2', [userId, guildId]);
    await db.getUser(userId, guildId);

    // Mock member object
    const member = {
        id: userId,
        guild: { id: guildId },
        user: { id: userId },
        roles: { cache: { has: () => false } }
    };

    // 1. Test Default Job Perk
    console.log('\n1. Testing Default Job Perk (Milestone 1)...');
    await db.pool.query('UPDATE users SET milestone_count = 1, job = $1 WHERE user_id = $2', ['default', userId]);
    let reward = await calculateReward(1000, member, 'income');
    console.log(`Default Milestone 1 -> Base: 1000, Multiplier: ${reward.percent}%, Result: ${reward.total}`);
    // Expected: 1000 * 1.05 = 1050 (5% bonus)

    // 2. Test Programmer Perk in Minigame
    console.log('\n2. Testing Programmer Perk (Milestone 3)...');
    await db.pool.query('UPDATE users SET milestone_count = 3, job = $1 WHERE user_id = $2', ['programmer', userId]);

    let rewardMinigame = await calculateReward(1000, member, 'income', { category: 'minigame' });
    console.log(`Programmer Minigame Milestone 3 -> Base: 1000, Bonus: ${rewardMinigame.percent}%, Result: ${rewardMinigame.total}`);
    // Expected: 1000 * 1.15 = 1150 (5% * 3 = 15%)

    let rewardWork = await calculateReward(1000, member, 'income', { category: 'work' });
    console.log(`Programmer Work Milestone 3 -> Base: 1000, Bonus: ${rewardWork.percent}%, Result: ${rewardWork.total}`);
    // Expected: 1000 * 1.0 = 1000 (0% bonus for work category)


    // 3. Test Teacher Multiplier (via manual utility check)
    const teacherBonus = getJobMilestoneBonus({ job: 'teacher', milestone_count: 5 }, 'xp');
    console.log(`\n3. Teacher XP Perk (Milestone 5) -> Expected: 0.5, Got: ${teacherBonus}`);

    // 4. Test Police Perk (Work/Search)
    console.log('\n4. Testing Police Perk (Milestone 2)...');
    await db.pool.query('UPDATE users SET milestone_count = 2, job = $1 WHERE user_id = $2', ['police', userId]);

    let rewardPoliceWork = await calculateReward(1000, member, 'income', { category: 'work' });
    console.log(`Police Work Milestone 2 -> Base: 1000, Bonus: ${rewardPoliceWork.percent}%, Result: ${rewardPoliceWork.total}`);
    // Expected: 1000 * 1.10 = 1100 (5% * 2 = 10%)

    console.log('\n--- Phase 2: Cleanup ---');
    await db.pool.query('DELETE FROM users WHERE user_id = $1 AND guild_id = $2', [userId, guildId]);
    console.log('Test completed successfully.');
    process.exit(0);
}

test().catch(err => {
    console.error('Test FAILED:', err);
    process.exit(1);
});
