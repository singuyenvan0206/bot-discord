module.exports = {
    TYPES: {
        cafe: {
            id: 'cafe',
            numeric_id: 901,
            name: { vi: 'Quán Cà Phê', en: 'Cafe' },
            base_price: 100000,
            base_income: 4000,
            manager_hourly_cost: 250,
            max_level: 5,
            icon: '☕'
        },
        casino: {
            id: 'casino',
            numeric_id: 902,
            name: { vi: 'Sòng Bạc', en: 'Casino' },
            base_price: 1000000,
            base_income: 40000,
            manager_hourly_cost: 3000,
            max_level: 10,
            icon: '🎰'
        },
        hotel: {
            id: 'hotel',
            numeric_id: 903,
            name: { vi: 'Khách Sạn', en: 'Hotel' },
            base_price: 5000000,
            base_income: 100000,
            manager_hourly_cost: 7500,
            max_level: 20,
            icon: '🏨'
        },
        startup: {
            id: 'startup',
            numeric_id: 904,
            name: { vi: 'Công Ty Công Nghệ', en: 'Tech Startup' },
            base_price: 25000000,
            base_income: 200000,
            manager_hourly_cost: 30000,
            max_level: 10,
            icon: '🚀'
        },
        studio: {
            id: 'studio',
            numeric_id: 905,
            name: { vi: 'Hãng Phim', en: 'Production Studio' },
            base_price: 100000000,
            base_income: 1000000,
            manager_hourly_cost: 100000,
            max_level: 15,
            icon: '🎬'
        },
        airline: {
            id: 'airline',
            numeric_id: 906,
            name: { vi: 'Hãng Hàng Không', en: 'Airline' },
            base_price: 500000000,
            base_income: 3000000,
            manager_hourly_cost: 416666,
            max_level: 25,
            icon: '✈️'
        }
    },
    UPGRADE_COST_MULTIPLIER: 1.08,
    MANAGER_INCOME_MULTIPLIER: 1.2, // 20% more income while active
    RANDOM_EVENTS: [
        { name: { vi: 'Thuế Hội Đồng', en: 'Council Tax' }, chance: 0.05, cost_mult: 0.1 },
        { name: { vi: 'Sửa Chữa Định Kỳ', en: 'Routine Maintenance' }, chance: 0.03, cost_mult: 0.05 },
        { name: { vi: 'Khách Hàng VIP', en: 'VIP Customer' }, chance: 0.02, income_mult: 2 },
        { name: { vi: 'Bùng Nổ Thị Trường', en: 'Market Boom' }, chance: 0.015, income_mult: 3 },
        { name: { vi: 'Đứt Gãy Chuỗi Cung Ứng', en: 'Supply Shortfall' }, chance: 0.03, cost_mult: 0.15 }
    ],

    calculateBusinessIncome(businessId, level) {
        const type = this.TYPES[businessId];
        if (!type) return 0;

        // Income formula: base * (1 + (level-1)*0.5)
        const levelBonus = 1 + (level - 1) * 0.5;
        return Math.floor(type.base_income * levelBonus);
    }
};
