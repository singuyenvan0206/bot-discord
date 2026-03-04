const multiplier = require('./src/utils/multiplier');
console.log('Exported keys:', Object.keys(multiplier));
if (multiplier.getJobMilestoneBonus) {
    console.log('getJobMilestoneBonus is EXPORTED');
    try {
        const bonus = multiplier.getJobMilestoneBonus({ milestone_count: 5, job: 'teacher' }, 'xp');
        console.log('Test call success, bonus:', bonus);
    } catch (e) {
        console.error('Call FAILED:', e);
    }
} else {
    console.log('getJobMilestoneBonus is NOT exported!');
}
