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
            price: 2000000,
            icon: '💀',
            color: '#e74c3c'
        },
        mythical: {
            id: 'mythical',
            numeric_id: 805,
            name: { vi: 'Rương Thần Thoại', en: 'Mythical Crate' },
            price: 10000000,
            icon: '👑',
            color: '#9b59b6'
        },
        ethereal: {
            id: 'ethereal',
            numeric_id: 806,
            name: { vi: 'Rương Linh Hồn', en: 'Ethereal Crate' },
            price: 50000000,
            icon: '✨',
            color: '#1abc9c'
        }
    },
    LOOT_TABLES: {
        common: [
            { item: '101', chance: 0.1 },  // Cookie
            { item: '201', chance: 0.1 },  // Smartphone
            { item: '202', chance: 0.1 },  // Shield
            { item: '401', chance: 0.15 }, // Bread Bait
            { item: '402', chance: 0.15 }, // Worm Bait
            { item: '601', chance: 0.05 }, // Basic Rod
            { item: '611', chance: 0.1 },  // Basic Bait
            { coins: [1000, 5000], chance: 0.25 }
        ],
        rare: [
            { item: '203', chance: 0.08 }, // Knight Sword
            { item: '204', chance: 0.08 }, // Sneakers
            { item: '205', chance: 0.08 }, // Pickaxe
            { item: '206', chance: 0.08 }, // RGB Keyboard
            { item: '207', chance: 0.08 }, // Gaming Mouse
            { item: '403', chance: 0.1 },  // Shrimp Bait
            { item: '404', chance: 0.1 },  // Cricket Bait
            { item: '501', chance: 0.05 }, // Shield of Protection
            { item: '602', chance: 0.05 }, // Better Rod
            { item: '701', chance: 0.05 }, // Ordinary Ring
            { coins: [5000, 20000], chance: 0.27 }
        ],
        legendary: [
            { item: '208', chance: 0.07 }, // Whiteboard
            { item: '209', chance: 0.07 }, // Guitar
            { item: '210', chance: 0.07 }, // 4K Monitor
            { item: '211', chance: 0.07 }, // Rifle
            { item: '212', chance: 0.07 }, // Laptop
            { item: '405', chance: 0.1 },  // Squid Bait
            { item: '406', chance: 0.1 },  // Golden Bait
            { item: '502', chance: 0.05 }, // XP Boost Potion
            { item: '603', chance: 0.05 }, // Expert Rod
            { item: '702', chance: 0.05 }, // Silver Ring
            { coins: [50000, 150000], chance: 0.3 }
        ],
        forbidden: [
            { item: '213', chance: 0.06 }, // Standing Desk
            { item: '214', chance: 0.06 }, // Trading Terminal
            { item: '215', chance: 0.06 }, // Ergonomic Chair
            { item: '216', chance: 0.06 }, // Business Suit
            { item: '217', chance: 0.06 }, // Combat Armor
            { item: '503', chance: 0.05 }, // Career Change Voucher
            { item: '604', chance: 0.05 }, // Master Rod
            { item: '703', chance: 0.05 }, // Gold Ring
            { item: 'hidden_vanity_1', chance: 0.05 }, // Special cosmetic
            { coins: [1000000, 5000000], chance: 0.5 }
        ],
        mythical: [
            { item: '218', chance: 0.1 }, // Grand Piano
            { item: '308', chance: 0.1 }, // Rolex
            { item: '219', chance: 0.05 }, // Supercar
            { item: '413', chance: 0.05 }, // Neptune's Rod
            { item: '309', chance: 0.05 }, // Golden Horseshoe
            { coins: [5000000, 25000000], chance: 0.65 }
        ],
        ethereal: [
            { item: '110', chance: 0.1 }, // Space Station
            { item: '220', chance: 0.25 }, // Superyacht
            { item: '310', chance: 0.15 }, // Time Machine
            { coins: [50000000, 200000000], chance: 0.5 }
        ]
    }
};
