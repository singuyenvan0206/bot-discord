module.exports = {
    TIERS: {
        room: {
            id: 'room',
            numeric_id: 1001,
            name: { vi: 'Phòng Trọ', en: 'Rental Room' },
            price: 100000,
            xp_buff: 0.02,
            income_buff: 0.01,
            max_bet_bonus: 25000,
            cap_bonus: 0.05,
            icon: '🏠'
        },
        apartment: {
            id: 'apartment',
            numeric_id: 1002,
            name: { vi: 'Căn Hộ', en: 'Apartment' },
            price: 500000,
            xp_buff: 0.05,
            income_buff: 0.02,
            max_bet_bonus: 100000,
            cap_bonus: 0.1,
            icon: '🏙️'
        },
        villa: {
            id: 'villa',
            numeric_id: 1003,
            name: { vi: 'Biệt Thự', en: 'Villa' },
            price: 2500000,
            xp_buff: 0.10,
            income_buff: 0.05,
            max_bet_bonus: 500000,
            cap_bonus: 0.2,
            icon: '🏡'
        },
        mansion: {
            id: 'mansion',
            numeric_id: 1004,
            name: { vi: 'Siêu Biệt Thự', en: 'Mansion' },
            price: 10000000,
            xp_buff: 0.20,
            income_buff: 0.10,
            max_bet_bonus: 1000000,
            cap_bonus: 0.4,
            icon: '🏰'
        },
        island: {
            id: 'island',
            numeric_id: 1005,
            name: { vi: 'Đảo Tư Nhân', en: 'Private Island' },
            price: 50000000,
            xp_buff: 0.35,
            income_buff: 0.15,
            max_bet_bonus: 5000000,
            cap_bonus: 0.7,
            icon: '🏝️'
        },
        penthouse: {
            id: 'penthouse',
            numeric_id: 1006,
            name: { vi: 'Căn Hộ Áp Mái (Penthouse)', en: 'Penthouse' },
            price: 250000000,
            xp_buff: 0.50,
            income_buff: 0.20,
            max_bet_bonus: 15000000,
            cap_bonus: 1.0,
            icon: '🏢'
        },
        space_station: {
            id: 'space_station',
            numeric_id: 1007,
            name: { vi: 'Trạm Vũ Trụ', en: 'Space Station' },
            price: 1500000000,
            xp_buff: 1.0,
            income_buff: 0.5,
            max_bet_bonus: 50000000,
            cap_bonus: 2.0,
            icon: '🛰️'
        }
    },
    INTERIORS: {
        gaming_setup: { numeric_id: 1101, name: { vi: 'Dàn Máy Gaming', en: 'Gaming Setup' }, price: 50000, buff: 'xp', value: 0.01 },
        designer_sofa: { numeric_id: 1102, name: { vi: 'Sofa Thiết Kế', en: 'Designer Sofa' }, price: 30000, buff: 'income', value: 0.005 },
        gold_safe: { numeric_id: 1103, name: { vi: 'Két Sắt Vàng', en: 'Gold Safe' }, price: 200000, buff: 'max_bet', value: 50000 },
        library: { numeric_id: 1104, name: { vi: 'Thư Viện Gia Đình', en: 'Home Library' }, price: 1000000, buff: 'cap', value: 0.5 },
        art_gallery: { numeric_id: 1105, name: { vi: 'Phòng Triển Lãm', en: 'Art Gallery' }, price: 5000000, buff: 'income', value: 0.15 },
        home_gym: { numeric_id: 1106, name: { vi: 'Phòng Gym Tại Gia', en: 'Home Gym' }, price: 1500000, buff: 'xp', value: 0.20 }
    }
};
