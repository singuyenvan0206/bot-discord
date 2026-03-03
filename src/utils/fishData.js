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
const CATCHES = [
    { key: 'old_boot', emoji: '👢', value: 0, weight: 150, minLuck: 0 },
    { key: 'rusty_can', emoji: '🥫', value: 0, weight: 150, minLuck: 0 },
    { key: 'seaweed', emoji: '🌿', value: 2, weight: 200, minLuck: 0 },
    { key: 'tilapia', emoji: '🐟', value: 10, weight: 100, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 20, weight: 100, minLuck: 0 },
    { key: 'carp', emoji: '🐟', value: 30, weight: 100, minLuck: 0 },
    { key: 'brook_trout', emoji: '🐟', value: 45, weight: 100, minLuck: 0 },
    { key: 'archerfish', emoji: '🐟', value: 100, weight: 110, minLuck: 0.2 },
    { key: 'betta', emoji: '🐠', value: 200, weight: 100, minLuck: 0.4 },
    { key: 'bass', emoji: '🐟', value: 400, weight: 150, minLuck: 0.6 },
    { key: 'sockeye_salmon', emoji: '🐟', value: 600, weight: 150, minLuck: 0.8 },
    { key: 'pufferfish', emoji: '🐡', value: 900, weight: 180, minLuck: 1.0 },
    { key: 'clownfish', emoji: '🐠', value: 1300, weight: 170, minLuck: 1.2 },
    { key: 'arowana', emoji: '🐉', value: 1800, weight: 155, minLuck: 1.4 },
    { key: 'stingray', emoji: '🐡', value: 2500, weight: 160, minLuck: 1.6 },
    { key: 'sunfish', emoji: '☀️', value: 3500, weight: 150, minLuck: 1.8 },
    { key: 'tuna', emoji: '🐟', value: 4500, weight: 150, minLuck: 2.0 },
    { key: 'swordfish', emoji: '🗡️', value: 4000, weight: 130, minLuck: 2.2 },
    { key: 'sturgeon', emoji: '🐟', value: 4500, weight: 130, minLuck: 2.4 },
    { key: 'manta_ray', emoji: '🐋', value: 3500, weight: 120, minLuck: 2.6 },
    { key: 'shark', emoji: '🦈', value: 4000, weight: 110, minLuck: 2.8 },
    { key: 'alligator_gar', emoji: '🐊', value: 6000, weight: 100, minLuck: 3.0 },
    { key: 'whale', emoji: '🐋', value: 8000, weight: 90, minLuck: 3.2 },
    { key: 'anglerfish', emoji: '🏮', value: 10000, weight: 300, minLuck: 3.5 },
    { key: 'treasure_chest', emoji: '💰', value: 12000, weight: 150, minLuck: 3.8 },
    { key: 'mythical_pearl', emoji: '🔮', value: 25000, weight: 100, minLuck: 4.2 },
    { key: 'kraken', emoji: '🐙', value: 45000, weight: 80, minLuck: 4.5 },
    { key: 'megalodon', emoji: '🦈', value: 80000, weight: 50, minLuck: 4.8 },
    { key: 'thousand_year_turtle', emoji: '🐢', value: 120000, weight: 30, minLuck: 5.0 },
    { key: 'poseidon_trident', emoji: '🔱', value: 180000, weight: 15, minLuck: 5.2 },
    { key: 'ocean_dragon', emoji: '🐉', value: 250000, weight: 8, minLuck: 5.5 }
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
