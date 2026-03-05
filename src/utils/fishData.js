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
    { key: 'goldfish', emoji: '🐠', value: 15, weight: 120, minLuck: 0 },
    { key: 'bluegill', emoji: '🐟', value: 25, weight: 110, minLuck: 0 },
    { key: 'tilapia', emoji: '🐟', value: 35, weight: 100, minLuck: 0 },
    { key: 'perch', emoji: '🐟', value: 45, weight: 90, minLuck: 0 },
    { key: 'sardine', emoji: '🐟', value: 60, weight: 85, minLuck: 0 },
    { key: 'carp', emoji: '🐟', value: 80, weight: 80, minLuck: 0 },
    { key: 'catfish', emoji: '🐱', value: 120, weight: 75, minLuck: 0.3 },
    { key: 'brook_trout', emoji: '🐟', value: 180, weight: 70, minLuck: 0.5 },
    { key: 'archerfish', emoji: '🐟', value: 300, weight: 110, minLuck: 0.7 },
    { key: 'betta', emoji: '🐠', value: 500, weight: 100, minLuck: 0.9 },
    { key: 'bass', emoji: '🐟', value: 800, weight: 150, minLuck: 1.1 },
    { key: 'eel', emoji: '🐍', value: 1200, weight: 140, minLuck: 1.3 },
    { key: 'sockeye_salmon', emoji: '🐟', value: 1800, weight: 150, minLuck: 1.5 },
    { key: 'pufferfish', emoji: '🐡', value: 2500, weight: 180, minLuck: 1.7 },
    { key: 'clownfish', emoji: '🐠', value: 3500, weight: 170, minLuck: 1.9 },
    { key: 'octopus', emoji: '🐙', value: 5000, weight: 160, minLuck: 2.1 },
    { key: 'arowana', emoji: '🐉', value: 7500, weight: 155, minLuck: 2.3 },
    { key: 'seahorse', emoji: '🐎', value: 10000, weight: 140, minLuck: 2.5 },
    { key: 'stingray', emoji: '🐡', value: 15000, weight: 160, minLuck: 2.7 },
    { key: 'sunfish', emoji: '☀️', value: 20000, weight: 150, minLuck: 2.9 },
    { key: 'swordfish', emoji: '🗡️', value: 25000, weight: 130, minLuck: 3.1 },
    { key: 'dolphin', emoji: '🐬', value: 35000, weight: 120, minLuck: 3.3 },
    { key: 'tuna', emoji: '🐟', value: 45000, weight: 150, minLuck: 3.5 },
    { key: 'manta_ray', emoji: '🐋', value: 55000, weight: 120, minLuck: 3.7 },
    { key: 'sturgeon', emoji: '🐟', value: 70000, weight: 110, minLuck: 4.0 },
    { key: 'marlin', emoji: '🐟', value: 85000, weight: 100, minLuck: 4.3 },
    { key: 'hammerhead', emoji: '🦈', value: 110000, weight: 95, minLuck: 4.6 },
    { key: 'shark', emoji: '🦈', value: 150000, weight: 90, minLuck: 4.9 },
    { key: 'alligator_gar', emoji: '🐊', value: 200000, weight: 85, minLuck: 5.2 },
    { key: 'whale', emoji: '🐋', value: 300000, weight: 80, minLuck: 5.5 },
    { key: 'dragonfish', emoji: '🐉', value: 500000, weight: 70, minLuck: 5.8 },
    { key: 'anglerfish', emoji: '🏮', value: 750000, weight: 60, minLuck: 6.1 },
    { key: 'treasure_chest', emoji: '💰', value: 1000000, weight: 50, minLuck: 6.4 },
    { key: 'phoenix_fish', emoji: '🔥', value: 1500000, weight: 40, minLuck: 6.7 },
    { key: 'mythical_pearl', emoji: '🔮', value: 2500000, weight: 30, minLuck: 7.0 },
    { key: 'kraken', emoji: '🐙', value: 5000000, weight: 20, minLuck: 7.3 },
    { key: 'megalodon', emoji: '🦈', value: 10000000, weight: 15, minLuck: 7.6 },
    { key: 'thousand_year_turtle', emoji: '🐢', value: 25000000, weight: 10, minLuck: 7.9 },
    { key: 'poseidon_trident', emoji: '🔱', value: 75000000, weight: 5, minLuck: 8.2 },
    { key: 'ocean_dragon', emoji: '🐉', value: 150000000, weight: 3, minLuck: 8.5 },
    { key: 'galaxy_whale', emoji: '🌌', value: 500000000, weight: 2, minLuck: 9.0 },
    { key: 'void_leviathan', emoji: '🌀', value: 1000000000, weight: 1, minLuck: 9.5 }
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

/**
 * Centralized fishing luck calculation.
 * Standardizes luck logic across fish and fishrates commands.
 * 
 * @param {object} user - User database object
 * @param {object} rod - Selected rod item
 * @param {object} bait - Selected bait item
 * @param {object} event - Current active event
 * @param {Array} buffs - User's active buffs array
 * @returns {number} - Total calculated luck
 */
function calculateFishingLuck(user, rod, bait, event = {}, buffs = []) {
    // 1. Base User Luck (Level-based scaling)
    // Formula: 1.0 + (level * 0.02)
    // Level 50 = +1.0 Luck, Level 100 = +2.0 Luck
    const baseLuck = 1.0 + ((user.level || 0) * 0.02);

    // 2. Gear Luck (Additive rod + bait)
    const rodLuck = rod?.luck || 1.0;
    const baitLuck = bait?.luck || 0;
    let gearLuck = rodLuck + baitLuck;

    // 3. Combine Base and Gear
    let totalLuck = baseLuck + gearLuck - 1.0; // Subtract 1.0 to avoid double-counting base-line

    // 4. Job Bonuses (Farmer)
    if (user.job === 'farmer') {
        const farmerConfig = require('../config').ECONOMY.JOBS.farmer;
        // Multiplier bonus (e.g. x1.2)
        totalLuck *= (farmerConfig.luck || 1.2);

        // Milestone Bonus: +0.2 Luck per point
        const points = Number(user.milestone_count || 0);
        totalLuck += points * 0.2;
    }

    // 5. Active Buffs (Hacker luck buff 610)
    const now = Math.floor(Date.now() / 1000);
    const luckBuff = buffs.find(b => b.itemId === 610 && b.expiresAt > now);
    if (luckBuff) totalLuck *= 1.25;

    // 6. Global Event Luck
    if (event?.fishLuck) totalLuck *= event.fishLuck;

    return Math.max(0.1, totalLuck); // Minimum luck floor
}

module.exports = { RODS, BAITS, CATCHES, getWeightedPool, calculateFishingLuck };
