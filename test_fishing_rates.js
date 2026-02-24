const CATCHES = [
    { key: 'old_boot', emoji: '👢', value: 0, weight: 20, minLuck: 0 },
    { key: 'rusty_can', emoji: '🥫', value: 0, weight: 20, minLuck: 0 },
    { key: 'seaweed', emoji: '🌿', value: 10, weight: 15, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 100, weight: 20, minLuck: 0 },
    { key: 'brook_trout', emoji: '🐟', value: 250, weight: 15, minLuck: 0 },
    { key: 'bass', emoji: '🐟', value: 500, weight: 10, minLuck: 0.8 },
    { key: 'sockeye_salmon', emoji: '🐟', value: 800, weight: 10, minLuck: 1.0 },
    { key: 'pufferfish', emoji: '🐡', value: 1200, weight: 12, minLuck: 1.2 },
    { key: 'clownfish', emoji: '🐠', value: 2000, weight: 8, minLuck: 1.5 },
    { key: 'stingray', emoji: '🐡', value: 5000, weight: 5, minLuck: 1.8 },
    { key: 'tuna', emoji: '🐟', value: 7500, weight: 8, minLuck: 2.0 },
    { key: 'swordfish', emoji: '🗡️', value: 15000, weight: 5, minLuck: 2.2 },
    { key: 'manta_ray', emoji: '🐋', value: 25000, weight: 4, minLuck: 2.5 },
    { key: 'shark', emoji: '🦈', value: 50000, weight: 3, minLuck: 2.8 },
    { key: 'whale', emoji: '🐋', value: 100000, weight: 2, minLuck: 3.0 },
    { key: 'anglerfish', emoji: '🏮', value: 200000, weight: 1.5, minLuck: 3.2 },
    { key: 'treasure_chest', emoji: '💰', value: 350000, weight: 1, minLuck: 2.5 },
    { key: 'mythical_pearl', emoji: '🔮', value: 750000, weight: 0.5, minLuck: 3.5 },
    { key: 'kraken', emoji: '🐙', value: 1500000, weight: 0.3, minLuck: 4.0 },
    { key: 'megalodon', emoji: '🦈', value: 5000000, weight: 0.1, minLuck: 4.5 },
    { key: 'poseidon_trident', emoji: '🔱', value: 15000000, weight: 0.05, minLuck: 5.0 }
];

function simulate(totalLuck, iterations = 10000) {
    console.log(`\n--- Simulating luck: ${totalLuck.toFixed(1)}x (${iterations} iterations) ---`);
    const results = {};
    let totalValue = 0;

    for (let i = 0; i < iterations; i++) {
        let pool = CATCHES.filter(c => c.minLuck <= totalLuck);
        let weightedPool = pool.map(c => {
            let modWeight = c.weight;
            if (totalLuck > 2.0 && c.value > 500) modWeight *= 2;
            if (totalLuck > 3.0 && c.value > 1000) modWeight *= 3;
            if (totalLuck > 2.0 && c.value === 0) modWeight *= 0.5;
            return { ...c, weight: modWeight };
        });

        let totalWeight = weightedPool.reduce((acc, c) => acc + c.weight, 0);
        let random = Math.random() * totalWeight;
        let caughtItem = weightedPool[0];

        for (const c of weightedPool) {
            random -= c.weight;
            if (random <= 0) {
                caughtItem = c;
                break;
            }
        }

        results[caughtItem.key] = (results[caughtItem.key] || 0) + 1;
        totalValue += caughtItem.value;
    }

    const sorted = Object.entries(results).sort((a, b) => b[1] - a[1]);
    console.log(`- Top 3 catches: ${sorted.slice(0, 3).map(([k, v]) => `${k} (${((v / iterations) * 100).toFixed(1)}%)`).join(', ')}`);
    if (sorted.length > 5) {
        console.log(`- Rare catches: ${sorted.slice(-3).map(([k, v]) => `${k} (${v} total)`).join(', ')}`);
    }
    console.log(`- Average value per catch: ${Math.floor(totalValue / iterations).toLocaleString()} coins`);
}

simulate(1.0); // Bamboo
simulate(2.0); // Fiberglass + Bait
simulate(4.0); // Carbon + Bait
simulate(7.2); // Titanium + Squid

