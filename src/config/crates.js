module.exports = {
    TYPES: {
        common: {
            id: 'common',
            numeric_id: 801,
            name: { vi: 'Rương Thường', en: 'Common Crate' },
            price: 10000,
            icon: '📦',
            color: '#95a5a6'
        },
        rare: {
            id: 'rare',
            numeric_id: 802,
            name: { vi: 'Rương Hiếm', en: 'Rare Crate' },
            price: 50000,
            icon: '🔷',
            color: '#3498db'
        },
        legendary: {
            id: 'legendary',
            numeric_id: 803,
            name: { vi: 'Rương Huyền Thoại', en: 'Legendary Crate' },
            price: 250000,
            icon: '🔶',
            color: '#f1c40f'
        },
        forbidden: {
            id: 'forbidden',
            numeric_id: 804,
            name: { vi: 'Rương Cấm', en: 'Forbidden Crate' },
            price: 1000000,
            icon: '💀',
            color: '#e74c3c'
        },
        mythical: {
            id: 'mythical',
            numeric_id: 805,
            name: { vi: 'Rương Thần Thoại', en: 'Mythical Crate' },
            price: 4000000,
            icon: '👑',
            color: '#9b59b6'
        },
        ethereal: {
            id: 'ethereal',
            numeric_id: 806,
            name: { vi: 'Rương Linh Hồn', en: 'Ethereal Crate' },
            price: 20000000,
            icon: '✨',
            color: '#1abc9c'
        }
    },
    LOOT_TABLES: {
        common: [
            { item: '101', chance: 0.15 }, // Cookie (daily)
            { item: '201', chance: 0.15 }, // Smartphone (income)
            { item: '401', chance: 0.15 }, // Bread Bait
            { item: '402', chance: 0.15 }, // Worm Bait
            { item: '501', chance: 0.05 }, // Shield of Protection
            { coins: [50, 200], chance: 0.35 }
        ],
        rare: [
            { item: '102', chance: 0.10 }, // Shag Rug (daily)
            { item: '202', chance: 0.10 }, // RGB Keyboard (income)
            { item: '301', chance: 0.10 }, // Golden Dice (gamble)
            { item: '403', chance: 0.10 }, // Shrimp Bait
            { item: '404', chance: 0.08 }, // Cricket Bait
            { item: '407', chance: 0.05 }, // Plastic Rod
            { item: '408', chance: 0.05 }, // Bamboo Rod
            { item: '701', chance: 0.05 }, // Wedding Ring
            { coins: [250, 1000], chance: 0.37 }
        ],
        legendary: [
            { item: '103', chance: 0.08 }, // Moai Statue (daily)
            { item: '203', chance: 0.08 }, // 4K Monitor (income)
            { item: '302', chance: 0.08 }, // Emerald Necklace (gamble)
            { item: '405', chance: 0.08 }, // Squid Bait
            { item: '406', chance: 0.08 }, // Golden Bait
            { item: '409', chance: 0.06 }, // Fiberglass Rod
            { item: '502', chance: 0.05 }, // XP Boost Potion
            { item: '702', chance: 0.05 }, // Diamond Ring
            { coins: [1250, 5000], chance: 0.44 }
        ],
        forbidden: [
            { item: '104', chance: 0.07 }, // VIP Golden Ticket (daily — doubles cap!)
            { item: '204', chance: 0.1 }, // Trading Terminal (income)
            { item: '303', chance: 0.1 }, // Clay Chips (gamble)
            { item: '411', chance: 0.12 }, // Carbon Rod
            { item: '503', chance: 0.11 }, // Career Change Voucher
            { coins: [5000, 20000], chance: 0.5 }
        ],
        mythical: [
            { item: '304', chance: 0.15 }, // 4-Leaf Clover (gamble)
            { item: '412', chance: 0.25 }, // Titanium Rod
            { item: '413', chance: 0.1 }, // Neptune's Rod
            { coins: [20000, 80000], chance: 0.5 }
        ],
        ethereal: [
            { item: '105', chance: 0.15 }, // Space Station (daily)
            { item: '205', chance: 0.15 }, // Superyacht (income)
            { item: '305', chance: 0.15 }, // Time Machine (gamble)
            { coins: [100000, 400000], chance: 0.55 }
        ]
    }
};
