module.exports = [
    // --- Tier 1 (50 - 500) ---
    { id: 1, name: '🍪 Bánh Quy', price: 50, description: 'Bổ sung đường! (+1% Thưởng Hàng Ngày)', multiplier: 0.01, type: 'daily' },
    { id: 2, name: '🪱 Mồi Giun', price: 50, description: 'Mồi dùng một lần. Cần thiết để câu cá. (Luck: +10%)', multiplier: 0.1, type: 'bait' },
    { id: 3, name: '🦗 Mồi Dế', price: 150, description: 'Món khoái khẩu của cá. (Luck: +30%)', multiplier: 0.3, type: 'bait' },
    { id: 4, name: '🦑 Mồi Mực', price: 500, description: 'Không loài cá lớn nào cưỡng lại được. (Luck: +80%)', multiplier: 0.8, type: 'bait' },

    // --- Tier 2 (1,000 - 4,000) ---
    { id: 5, name: '📱 Điện Thoại', price: 1000, description: 'Luôn kết nối (+5% Thưởng Hàng Ngày)', multiplier: 0.05, type: 'daily' },
    { id: 6, name: '🛡️ Khiên Bảo Vệ', price: 1000, description: 'Bảo vệ 50% tiền cược trong Dò Mìn! (+3% Daily)', multiplier: 0.03, type: 'daily' },
    { id: 7, name: '⚔️ Kiếm Hiệp Sĩ', price: 1500, description: 'Trở thành lính đánh thuê (+5% Thu Nhập Làm Việc)', multiplier: 0.05, type: 'income' },
    { id: 8, name: '🛋️ Đèn Dung Nham', price: 1500, description: 'Cảm giác thư thái (+2% Daily)', multiplier: 0.02, type: 'daily' },
    { id: 9, name: '🎲 Xúc Xắc Vàng', price: 1500, description: 'Đổ số cao (+2% Gamble)', multiplier: 0.02, type: 'gamble' },
    { id: 10, name: '👟 Giày Thể Thao', price: 2000, description: 'Chạy nhanh hơn (+2% Work)', multiplier: 0.02, type: 'income' },
    { id: 11, name: '🎣 Cần Tre (Bậc 1)', price: 2500, description: 'Cần câu cơ bản. (Luck: 1.0x)', multiplier: 1.0, type: 'tool' },
    { id: 12, name: '⛏️ Cuốc Khai Thác', price: 2500, description: 'Đào tìm kho báu! (+5% Thu Nhập)', multiplier: 0.05, type: 'income' },
    { id: 13, name: '⌨️ Bàn Phím RGB', price: 2500, description: 'Gõ phím lạch cạch (+3% Work)', multiplier: 0.03, type: 'income' },
    { id: 14, name: '🖱️ Chuột Gaming', price: 2500, description: 'Click chuột chính xác (+3% Work)', multiplier: 0.03, type: 'income' },
    { id: 15, name: '🧸 Thảm Lông', price: 3000, description: 'Mềm mại đôi chân (+4% Daily)', multiplier: 0.04, type: 'daily' },
    { id: 16, name: '🃏 Bộ Bài Ám Hiệu', price: 3000, description: 'Biết khi nào nên theo (+4% Gamble)', multiplier: 0.04, type: 'gamble' },
    { id: 17, name: '🖥️ Màn Hình 4K', price: 4000, description: 'Rõ nét từng chi tiết (+5% Work)', multiplier: 0.05, type: 'income' },

    // --- Tier 3 (5,000 - 25,000) ---
    { id: 18, name: '💻 Laptop', price: 5000, description: 'Làm việc chăm chỉ hơn! (+10% Thu Nhập)', multiplier: 0.10, type: 'income' },
    { id: 19, name: '💍 Nhẫn Vàng', price: 5000, description: 'Sáng bóng và quý giá (+5% Gamble Win)', multiplier: 0.05, type: 'gamble' },
    { id: 20, name: '🎨 Tranh Trừu Tượng', price: 5000, description: 'Trang trí đẳng cấp (+6% Daily)', multiplier: 0.06, type: 'daily' },
    { id: 21, name: '🪙 Chip Đất Sét', price: 5000, description: 'Cảm giác chuyên nghiệp (+6% Gamble)', multiplier: 0.06, type: 'gamble' },
    { id: 22, name: '🪑 Bàn Đứng', price: 6000, description: 'Tư thế tốt hơn (+7% Work)', multiplier: 0.07, type: 'income' },
    { id: 23, name: '🍀 Cỏ 4 Lá', price: 7777, description: 'Cảm thấy may mắn? (+7% Tiền Thắng Cược)', multiplier: 0.07, type: 'gamble' },
    { id: 24, name: '💺 Ghế Công Thái Học', price: 8000, description: 'Làm việc thoải mái (+9% Work)', multiplier: 0.09, type: 'income' },
    { id: 25, name: '👔 Bộ Vest Công Sở', price: 10000, description: 'Trông chuyên nghiệp hơn (+20% Thu Nhập)', multiplier: 0.20, type: 'income' },
    { id: 26, name: '🎣 Cần Sợi Thủy Tinh (Bậc 2)', price: 10000, description: 'Bắt được cá xịn hơn! (Luck: 1.5x)', multiplier: 1.5, type: 'tool' },
    { id: 27, name: '⌚ Đồng Hồ Rolex', price: 10000, description: 'Thời gian là tiền bạc (+10% Gamble Win)', multiplier: 0.10, type: 'gamble' },
    { id: 28, name: '🗿 Tượng Đá', price: 10000, description: 'Vững như bàn thạch (+12% Daily)', multiplier: 0.12, type: 'daily' },
    { id: 31, name: '🐴 Móng Ngựa Vàng', price: 25000, description: 'May mắn thuần khiết (+25% Gamble)', multiplier: 0.25, type: 'gamble' },

    // --- Tier 4 (50,000+) ---
    { id: 32, name: '🎫 Vé Vàng VIP', price: 50000, description: 'Đặc quyền VIP (+50% Thưởng Hàng Ngày)', multiplier: 0.50, type: 'daily' },
    { id: 33, name: '🎣 Cần Sợi Carbon (Bậc 3)', price: 50000, description: 'Hàng đỉnh của đỉnh. (Luck: 2.5x)', multiplier: 2.5, type: 'tool' },
    { id: 34, name: '🏎️ Siêu Xe', price: 50000, description: 'Vút bay trên đường! (+25% Thu Nhập)', multiplier: 0.25, type: 'income' },
    { id: 35, name: '🏰 Biệt Thự', price: 250000, description: 'Sống đời thượng lưu (+100% Thưởng Hàng Ngày)', multiplier: 1.00, type: 'daily' },
    { id: 36, name: '🛥️ Siêu Du Thuyền', price: 1000000, description: 'Văn phòng trên biển (+50% Thu Nhập)', multiplier: 0.50, type: 'income' },
    { id: 37, name: '🚀 Trạm Không Gian', price: 5000000, description: 'Phần thưởng từ quỹ đạo (+200% Thưởng Hàng Ngày)', multiplier: 2.00, type: 'daily' },
    { id: 38, name: '⏳ Cỗ Máy Thời Gian', price: 10000000, description: 'Viết lại lịch sử (+50% Tiền Thắng Cược)', multiplier: 0.50, type: 'gamble' }
];
