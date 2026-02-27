const CATCHES = [
    { key: 'old_boot', emoji: '👢', value: 0, weight: 30, minLuck: 0 },
    { key: 'rusty_can', emoji: '🥫', value: 0, weight: 30, minLuck: 0 },
    { key: 'seaweed', emoji: '🌿', value: 5, weight: 80, minLuck: 0 },
    { key: 'tilapia', emoji: '🐟', value: 30, weight: 100, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 50, weight: 100, minLuck: 0 },
    { key: 'carp', emoji: '🐟', value: 80, weight: 100, minLuck: 0 },
    { key: 'brook_trout', emoji: '🐟', value: 120, weight: 100, minLuck: 0 },
    { key: 'archerfish', emoji: '🐟', value: 300, weight: 110, minLuck: 1.0 },
    { key: 'betta', emoji: '🐠', value: 450, weight: 100, minLuck: 3.0 },
    { key: 'bass', emoji: '🐟', value: 1000, weight: 150, minLuck: 2.0 },
    { key: 'sockeye_salmon', emoji: '🐟', value: 1500, weight: 150, minLuck: 4.0 },
    { key: 'pufferfish', emoji: '🐡', value: 2500, weight: 180, minLuck: 6.0 },
    { key: 'clownfish', emoji: '🐠', value: 4000, weight: 170, minLuck: 8.0 },
    { key: 'arowana', emoji: '🐉', value: 5500, weight: 155, minLuck: 9.0 },
    { key: 'stingray', emoji: '🐡', value: 7500, weight: 160, minLuck: 10.0 },
    { key: 'sunfish', emoji: '☀️', value: 9000, weight: 150, minLuck: 11.0 },
    { key: 'swordfish', emoji: '🗡️', value: 10000, weight: 130, minLuck: 15.0 },
    { key: 'manta_ray', emoji: '🐋', value: 10000, weight: 120, minLuck: 18.0 },
    { key: 'tuna', emoji: '🐟', value: 12000, weight: 150, minLuck: 12.0 },
    { key: 'sturgeon', emoji: '🐟', value: 12000, weight: 130, minLuck: 16.0 },
    { key: 'shark', emoji: '🦈', value: 12000, weight: 110, minLuck: 20.0 },
    { key: 'alligator_gar', emoji: '🐊', value: 15000, weight: 100, minLuck: 21.0 },
    { key: 'whale', emoji: '🐋', value: 18000, weight: 90, minLuck: 22.0 },
    { key: 'anglerfish', emoji: '🏮', value: 22000, weight: 80, minLuck: 25.0 },
    { key: 'treasure_chest', emoji: '💰', value: 35000, weight: 60, minLuck: 28.0 },
    { key: 'mythical_pearl', emoji: '🔮', value: 80000, weight: 100, minLuck: 32.0 },
    { key: 'kraken', emoji: '🐙', value: 160000, weight: 80, minLuck: 35.0 },
    { key: 'megalodon', emoji: '🦈', value: 350000, weight: 120, minLuck: 38.0 },
    { key: 'thousand_year_turtle', emoji: '🐢', value: 500000, weight: 150, minLuck: 40.0 },
    { key: 'poseidon_trident', emoji: '🔱', value: 650000, weight: 180, minLuck: 42.0 },
    { key: 'ocean_dragon', emoji: '🐉', value: 1000000, weight: 150, minLuck: 45.0 }
];

function simulate(luck) {
    let pool = CATCHES.filter(c => c.minLuck <= luck);
    pool = pool.map(c => {
        let modWeight = c.weight;

        if (c.value < 5000) {
            // Suppress common fish 
            modWeight *= Math.max(0.01, 1 - (luck / 50));
        } else if (c.value < 20000) {
            // Mid-tier: very small boost
            const luckDiff = Math.max(0, luck - c.minLuck);
            modWeight *= 1 + (luckDiff * 0.005);
        } else {
            // Rare items (>= 20000)
            modWeight *= 0.020; // Drop base drop chance to 2.0%
            const luckDiff = Math.max(0, luck - c.minLuck);
            modWeight *= 1 + (luckDiff * 0.05); // Give a 5% relative boost per luck
        }

        return { ...c, weight: modWeight };
    });

    const totalWeight = pool.reduce((acc, c) => acc + c.weight, 0);
    let ev = 0;

    console.log(`--- LUCK: ${luck} ---`);
    for (const item of pool.sort((a, b) => b.value - a.value)) {
        const chance = item.weight / totalWeight;
        ev += chance * item.value;
        if (luck >= 45 && item.value >= 20000) {
            console.log(`${item.key.padEnd(20)} | Val: ${item.value.toString().padEnd(7)} | Chance: ${(chance * 100).toFixed(4)}%`);
        }
    }
    console.log(`Expected Value: ${ev.toFixed(2)} coins\n`);
}

simulate(0);
simulate(10);
simulate(20);
simulate(30);
simulate(45);
