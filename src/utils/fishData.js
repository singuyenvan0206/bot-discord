/**
 * Shared fishing data used by both the `fish` and `fishrates` commands.
 * Exporting constants here avoids duplication and ensures a single source of truth.
 */

// Rod Definitions (IDs match category 400s)
const RODS = [
    { id: '413', luck: 3.0 },  // Neptune's Rod
    { id: '412', luck: 2.3 },  // Titanium Rod
    { id: '411', luck: 1.8 },  // Carbon Rod
    { id: '410', luck: 1.4 },  // Steel Rod
    { id: '409', luck: 1.1 },  // Fiberglass Rod
    { id: '408', luck: 1.0 },  // Bamboo Rod
    { id: '407', luck: 0.5 }   // Plastic Rod
];

// Bait Definitions (additive luck bonus)
const BAITS = [
    { id: '406', luck: 3.5 },  // Golden Bait
    { id: '405', luck: 2.0 },  // Squid Bait
    { id: '404', luck: 1.2 },  // Cricket Bait
    { id: '403', luck: 0.7 },  // Shrimp Bait
    { id: '402', luck: 0.3 },  // Worm Bait
    { id: '401', luck: 0.1 }   // Bread Bait
];

// Fish Table
// minLuck reference: max luck = rod.luck + bait.luck
//   Plastic(0.5)+Bread(0.1)=0.6 | Bamboo(1.0)+Worm(0.3)=1.3 | Steel(1.4)+Cricket(1.2)=2.6
//   Carbon(1.8)+Squid(2.0)=3.8  | Titanium(2.3)+Squid(2.0)=4.3 | Neptune(3.0)+Squid(2.0)=5.0
//   Neptune(3.0)+Golden(3.5)=6.5 (max) | Farmer x1.2 bonus
const CATCHES = [
    { key: 'old_boot', emoji: '👢', value: 0, weight: 150, minLuck: 0 },
    { key: 'rusty_can', emoji: '🥫', value: 0, weight: 150, minLuck: 0 },
    { key: 'seaweed', emoji: '🌿', value: 2, weight: 200, minLuck: 0 },
    { key: 'tilapia', emoji: '🐟', value: 10, weight: 100, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 20, weight: 100, minLuck: 0 },
    { key: 'carp', emoji: '🐟', value: 30, weight: 100, minLuck: 0 },
    { key: 'brook_trout', emoji: '🐟', value: 45, weight: 100, minLuck: 0 },
    { key: 'archerfish', emoji: '🐟', value: 100, weight: 110, minLuck: 0.5 },   // Plastic + any bait
    { key: 'betta', emoji: '🐠', value: 200, weight: 100, minLuck: 0.8 },         // Bamboo + Bread
    { key: 'bass', emoji: '🐟', value: 400, weight: 150, minLuck: 1.1 },          // Bamboo + Worm
    { key: 'sockeye_salmon', emoji: '🐟', value: 600, weight: 150, minLuck: 1.4 },// Bamboo + Shrimp
    { key: 'pufferfish', emoji: '🐡', value: 900, weight: 180, minLuck: 1.7 },    // Fiberglass + Shrimp
    { key: 'clownfish', emoji: '🐠', value: 1300, weight: 170, minLuck: 2.0 },    // Steel + Worm
    { key: 'arowana', emoji: '🐉', value: 1800, weight: 155, minLuck: 2.3 },      // Steel + Shrimp
    { key: 'stingray', emoji: '🐡', value: 2500, weight: 160, minLuck: 2.6 },     // Steel + Cricket
    { key: 'sunfish', emoji: '☀️', value: 3500, weight: 150, minLuck: 2.9 },      // Carbon + Worm
    { key: 'swordfish', emoji: '🗡️', value: 4000, weight: 130, minLuck: 3.0 },   // Carbon + Shrimp
    { key: 'tuna', emoji: '🐟', value: 4500, weight: 150, minLuck: 3.2 },         // Carbon + Cricket
    { key: 'manta_ray', emoji: '🐋', value: 3500, weight: 120, minLuck: 3.2 },   // Carbon + Cricket
    { key: 'sturgeon', emoji: '🐟', value: 4500, weight: 130, minLuck: 3.4 },     // Carbon + Cricket
    { key: 'shark', emoji: '🦈', value: 4000, weight: 110, minLuck: 3.5 },        // Carbon + Cricket / Titanium + Bait
    { key: 'alligator_gar', emoji: '🐊', value: 6000, weight: 100, minLuck: 3.8 },// Carbon + Squid
    { key: 'whale', emoji: '🐋', value: 8000, weight: 90, minLuck: 4.1 },         // Titanium + Worm
    { key: 'anglerfish', emoji: '🏮', value: 10000, weight: 300, minLuck: 4.2 },  // Titanium + Squid or Neptune + Cricket
    { key: 'treasure_chest', emoji: '💰', value: 12000, weight: 150, minLuck: 4.5 },// Titanium + Cricket
    { key: 'mythical_pearl', emoji: '🔮', value: 25000, weight: 100, minLuck: 5.0 },// Neptune + Squid
    { key: 'kraken', emoji: '🐙', value: 45000, weight: 80, minLuck: 5.3 },       // Titanium/Neptune + Golden
    { key: 'megalodon', emoji: '🦈', value: 80000, weight: 50, minLuck: 5.6 },    // Neptune + Squid/Golden
    { key: 'thousand_year_turtle', emoji: '🐢', value: 120000, weight: 30, minLuck: 5.9 }, // Neptune + Golden
    { key: 'poseidon_trident', emoji: '🔱', value: 180000, weight: 15, minLuck: 6.7 },     // Farmer only: Neptune + Golden (7.8)
    { key: 'ocean_dragon', emoji: '🐉', value: 250000, weight: 8, minLuck: 7.2 }           // Farmer only: Neptune + Golden (7.8)
];

/**
 * Build a weighted pool of catches filtered and modified by current luck.
 * @param {number} luck - The player's total luck value.
 * @returns {Array} - Array of catch objects with adjusted weights.
 */
function getWeightedPool(luck) {
    const pool = CATCHES.filter(c => c.minLuck <= luck);
    return pool.map(c => {
        let w = c.weight;
        const luckAboveMin = Math.max(0, luck - c.minLuck);

        if (c.value === 0) {
            // Trash: fades out quickly as luck increases (gone at luck ~7)
            w *= Math.max(0, 1 - luck * 0.15);
        } else if (c.value < 500) {
            // Common fish: gently suppressed at higher luck
            w *= Math.max(0.02, 1 - luck * 0.08);
        } else if (c.value < 5000) {
            // Mid-tier: slight boost per luck above minLuck
            w *= 1 + luckAboveMin * 0.06;
        } else if (c.value < 25000) {
            // High-tier: moderate boost per luck above minLuck
            w *= 1 + luckAboveMin * 0.10;
        } else {
            // Rare (25k+): strong boost, capped at 5× base weight
            w *= Math.min(5, 1 + luckAboveMin * 0.20);
        }

        return { ...c, weight: w };
    });
}

module.exports = { RODS, BAITS, CATCHES, getWeightedPool };
