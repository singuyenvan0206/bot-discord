module.exports = {
    TIERS: {
        room: {
            id: 'room',
            name: { vi: 'Phòng Trọ', en: 'Rental Room' },
            price: 100000,
            xp_buff: 0.02,
            income_buff: 0.01,
            max_bet_bonus: 25000,
            cap_bonus: 0.1,
            icon: '🏠'
        },
        apartment: {
            id: 'apartment',
            name: { vi: 'Căn Hộ', en: 'Apartment' },
            price: 500000,
            xp_buff: 0.05,
            income_buff: 0.03,
            max_bet_bonus: 100000,
            cap_bonus: 0.3,
            icon: '🏙️'
        },
        villa: {
            id: 'villa',
            name: { vi: 'Biệt Thự', en: 'Villa' },
            price: 2500000,
            xp_buff: 0.12,
            income_buff: 0.08,
            max_bet_bonus: 500000,
            cap_bonus: 0.8,
            icon: '🏡'
        },
        mansion: {
            id: 'mansion',
            name: { vi: 'Siêu Biệt Thự', en: 'Mansion' },
            price: 10000000,
            xp_buff: 0.25,
            income_buff: 0.15,
            max_bet_bonus: 2500000,
            cap_bonus: 1.5,
            icon: '🏰'
        },
        island: {
            id: 'island',
            name: { vi: 'Đảo Tư Nhân', en: 'Private Island' },
            price: 50000000,
            xp_buff: 0.60,
            income_buff: 0.40,
            max_bet_bonus: 25000000,
            cap_bonus: 4.0,
            icon: '🏝️'
        },
        penthouse: {
            id: 'penthouse',
            name: { vi: 'Căn Hộ Áp Mái (Penthouse)', en: 'Penthouse' },
            price: 250000000,
            xp_buff: 1.2,
            income_buff: 0.8,
            max_bet_bonus: 100000000,
            cap_bonus: 8.0,
            icon: '🏢'
        },
        space_station: {
            id: 'space_station',
            name: { vi: 'Trạm Vũ Trụ', en: 'Space Station' },
            price: 1500000000,
            xp_buff: 3.5,
            income_buff: 2.5,
            max_bet_bonus: 500000000,
            cap_bonus: 15.0,
            icon: '🛰️'
        }
    },
    INTERIORS: {
        gaming_setup: { name: { vi: 'Dàn Máy Gaming', en: 'Gaming Setup' }, price: 50000, buff: 'xp', value: 0.01 },
        designer_sofa: { name: { vi: 'Sofa Thiết Kế', en: 'Designer Sofa' }, price: 30000, buff: 'income', value: 0.005 },
        gold_safe: { name: { vi: 'Két Sắt Vàng', en: 'Gold Safe' }, price: 200000, buff: 'max_bet', value: 50000 },
        library: { name: { vi: 'Thư Viện Gia Đình', en: 'Home Library' }, price: 1000000, buff: 'cap', value: 0.5 },
        art_gallery: { name: { vi: 'Phòng Triển Lãm', en: 'Art Gallery' }, price: 5000000, buff: 'income', value: 0.15 },
        home_gym: { name: { vi: 'Phòng Gym Tại Gia', en: 'Home Gym' }, price: 1500000, buff: 'xp', value: 0.20 }
    }
};
