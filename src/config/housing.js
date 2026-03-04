module.exports = {
    TIERS: {
        room: {
            id: 'room',
            numeric_id: 1001,
            name: { vi: 'Phòng Trọ', en: 'Rental Room' },
            price: 50000,
            xp_buff: 0.01,
            income_buff: 0.002,
            max_bet_bonus: 5000,
            cap_bonus: 0,
            icon: '🏠'
        },
        apartment: {
            id: 'apartment',
            numeric_id: 1002,
            name: { vi: 'Căn Hộ', en: 'Apartment' },
            price: 250000,
            xp_buff: 0.02,
            income_buff: 0.005,
            max_bet_bonus: 10000,
            cap_bonus: 0,
            icon: '🏙️'
        },
        villa: {
            id: 'villa',
            numeric_id: 1003,
            name: { vi: 'Biệt Thự', en: 'Villa' },
            price: 1000000,
            xp_buff: 0.04,
            income_buff: 0.01,
            max_bet_bonus: 25000,
            cap_bonus: 0,
            icon: '🏡'
        },
        mansion: {
            id: 'mansion',
            numeric_id: 1004,
            name: { vi: 'Siêu Biệt Thự', en: 'Mansion' },
            price: 5000000,
            xp_buff: 0.07,
            income_buff: 0.02,
            max_bet_bonus: 75000,
            cap_bonus: 0,
            icon: '🏰'
        },
        island: {
            id: 'island',
            numeric_id: 1005,
            name: { vi: 'Đảo Tư Nhân', en: 'Private Island' },
            price: 15000000,
            xp_buff: 0.12,
            income_buff: 0.04,
            max_bet_bonus: 150000,
            cap_bonus: 0,
            icon: '🏝️'
        },
        penthouse: {
            id: 'penthouse',
            numeric_id: 1006,
            name: { vi: 'Căn Hộ Áp Mái (Penthouse)', en: 'Penthouse' },
            price: 50000000,
            xp_buff: 0.25,
            income_buff: 0.08,
            max_bet_bonus: 500000,
            cap_bonus: 0,
            icon: '🏢'
        },
        space_station: {
            id: 'space_station',
            numeric_id: 1007,
            name: { vi: 'Trạm Vũ Trụ', en: 'Space Station' },
            price: 150000000,
            xp_buff: 0.50,
            income_buff: 0.12,
            max_bet_bonus: 750000,
            cap_bonus: 0,
            icon: '🛰️'
        }
    },
    INTERIORS: {
        gaming_setup: { numeric_id: 1101, name: { vi: 'Dàn Máy Gaming', en: 'Gaming Setup' }, price: 25000, buff: 'xp', value: 0.03 },
        designer_sofa: { numeric_id: 1102, name: { vi: 'Sofa Thiết Kế', en: 'Designer Sofa' }, price: 15000, buff: 'income', value: 0.005 },
        gold_safe: { numeric_id: 1103, name: { vi: 'Két Sắt Vàng', en: 'Gold Safe' }, price: 100000, buff: 'max_bet', value: 50000 },
        library: { numeric_id: 1104, name: { vi: 'Thư Viện Gia Đình', en: 'Home Library' }, price: 500000, buff: 'cap', value: 0.10 },
        art_gallery: { numeric_id: 1105, name: { vi: 'Phòng Triển Lãm', en: 'Art Gallery' }, price: 2500000, buff: 'income', value: 0.02 },
        home_gym: { numeric_id: 1106, name: { vi: 'Phòng Gym Tại Gia', en: 'Home Gym' }, price: 750000, buff: 'xp', value: 0.06 }
    }
};
