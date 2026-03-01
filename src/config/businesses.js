module.exports = {
    TYPES: {
        cafe: {
            id: 'cafe',
            numeric_id: 901,
            name: { vi: 'Quán Cà Phê', en: 'Cafe' },
            base_price: 200000,
            base_income: 2500,
            max_level: 5,
            icon: '☕'
        },
        casino: {
            id: 'casino',
            numeric_id: 902,
            name: { vi: 'Sòng Bạc', en: 'Casino' },
            base_price: 2000000,
            base_income: 30000,
            max_level: 10,
            icon: '🎰'
        },
        hotel: {
            id: 'hotel',
            numeric_id: 903,
            name: { vi: 'Khách Sạn', en: 'Hotel' },
            base_price: 10000000,
            base_income: 200000,
            max_level: 20,
            icon: '🏨'
        },
        startup: {
            id: 'startup',
            numeric_id: 904,
            name: { vi: 'Công Ty Công Nghệ', en: 'Tech Startup' },
            base_price: 50000000,
            base_income: 1200000,
            max_level: 10,
            icon: '🚀'
        },
        studio: {
            id: 'studio',
            numeric_id: 905,
            name: { vi: 'Hãng Phim', en: 'Production Studio' },
            base_price: 250000000,
            base_income: 6000000,
            max_level: 15,
            icon: '🎬'
        },
        airline: {
            id: 'airline',
            numeric_id: 906,
            name: { vi: 'Hãng Hàng Không', en: 'Airline' },
            base_price: 1500000000,
            base_income: 50000000,
            max_level: 25,
            icon: '✈️'
        }
    },
    UPGRADE_COST_MULTIPLIER: 1.5,
    STAFF_COST: 50000,
    STAFF_INCOME_BONUS: 0.1, // 10% more income per staff
    RANDOM_EVENTS: [
        { name: { vi: 'Thuế Hội Đồng', en: 'Council Tax' }, chance: 0.05, cost_mult: 0.1 },
        { name: { vi: 'Sửa Chữa Định Kỳ', en: 'Routine Maintenance' }, chance: 0.03, cost_mult: 0.05 },
        { name: { vi: 'Khách Hàng VIP', en: 'VIP Customer' }, chance: 0.02, income_mult: 2 },
        { name: { vi: 'Bùng Nổ Thị Trường', en: 'Market Boom' }, chance: 0.015, income_mult: 3 },
        { name: { vi: 'Đứt Gãy Chuỗi Cung Ứng', en: 'Supply Shortfall' }, chance: 0.03, cost_mult: 0.15 }
    ],

    calculateBusinessIncome(businessId, level, staff) {
        const type = this.TYPES[businessId];
        if (!type) return 0;

        // Income formula: base * (1 + (level-1)*0.5) * (1 + staff * STAFF_INCOME_BONUS)
        const levelBonus = 1 + (level - 1) * 0.5;
        const staffBonus = 1 + staff * this.STAFF_INCOME_BONUS;
        return Math.floor(type.base_income * levelBonus * staffBonus);
    }
};
