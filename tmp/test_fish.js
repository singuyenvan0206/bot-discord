const { RODS, BAITS, CATCHES, getWeightedPool, calculateFishingLuck } = require('../src/utils/fishData');
const fs = require('fs');

function simulate(user, iterations = 10000, rewardMultiplier = 1.0) {
    const rod = { id: '413', luck: 3.0 }; // Neptune
    const bait = { id: '406', luck: 3.5 }; // Golden
    const event = { fishLuck: 1.3, fishIncome: 0.5 }; // High-End Event
    const buffs = [{ itemId: 610, expiresAt: Math.floor(Date.now() / 1000) + 3600 }]; // Hacker Luck

    const totalLuck = calculateFishingLuck(user, rod, bait, event, buffs);
    const pool = getWeightedPool(totalLuck, user.job);
    const totalWeight = pool.reduce((acc, c) => acc + c.weight, 0);

    let totalValue = 0;
    let counts = {};
    let maxVal = 0;

    for (let i = 0; i < iterations; i++) {
        let random = Math.random() * totalWeight;
        let caught = pool[0];
        for (const c of pool) {
            random -= c.weight;
            if (random <= 0) {
                caught = c;
                break;
            }
        }
        const val = caught.value * rewardMultiplier;
        totalValue += val;
        counts[caught.key] = (counts[caught.key] || 0) + 1;
        if (val > maxVal) maxVal = val;
    }

    let report = `--- Scenario: ${user.label} ---\n`;
    report += `Luck: ${totalLuck.toFixed(2)} | Multiplier: ${rewardMultiplier.toFixed(2)}x\n`;
    report += `Average per 100 attempts: ${Math.floor((totalValue / iterations) * 100).toLocaleString()}\n`;
    report += `Max Single Gain: ${Math.floor(maxVal).toLocaleString()}\n`;
    report += `Top 5 Items:\n`;
    Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([key, count]) => {
            report += `- ${key}: ${count} (${((count / iterations) * 100).toFixed(2)}%)\n`;
        });
    report += `\n`;
    return report;
}

let finalReport = '';
// 1. Level 20 Police (Target Average User)
finalReport += simulate({ level: 20, job: 'police', label: 'Average Lv 20 Police' }, 10000, 2.5);

// 2. Level 100 Farmer "God Mode" 
// (VIP + Stacked Legendary + Event = ~4.0x multiplier)
finalReport += simulate({ level: 100, job: 'farmer', label: 'End-game God Farmer', milestone_count: 10 }, 10000, 4.0);

// 3. Level 1 Newbie (Basic Rod + Bread)
const newbieLuck = calculateFishingLuck({ level: 1 }, { id: '407', luck: 0.5 }, { id: '401', luck: 0.05 }, {}, []);
const newbiePool = getWeightedPool(newbieLuck);
let newbieVal = 0;
for (let i = 0; i < 10000; i++) {
    let weightSum = newbiePool.reduce((a, c) => a + c.weight, 0);
    let r = Math.random() * weightSum;
    for (const c of newbiePool) { r -= c.weight; if (r <= 0) { newbieVal += c.value; break; } }
}
finalReport += `--- Scenario: Lvl 1 Newbie (Starter Gear) ---\nAverage per 100 attempts: ${Math.floor((newbieVal / 10000) * 100).toLocaleString()}\n`;

fs.writeFileSync('./tmp/results.txt', finalReport);
console.log('Simulation complete. Check tmp/results.txt');
