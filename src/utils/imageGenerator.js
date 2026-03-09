const Jimp = require('jimp');
const path = require('path');

/**
 * Tạo Wanted Poster One Piece với tính năng tự động căn chỉnh và co giãn chữ.
 * @param {string} avatarUrl - Đường dẫn đến ảnh đại diện (file local hoặc URL)
 * @param {string} name - Tên nhân vật
 * @param {number|string} bounty - Số tiền thưởng
 * @returns {Promise<Buffer>} - Trả về buffer ảnh PNG
 */
async function generateWantedPoster(avatarUrl, name, bounty) {
    try {
        // 1. Định nghĩa đường dẫn và thông số kỹ thuật (Dựa trên template 640x640)
        const templatePath = path.join(__dirname, '../assets/wanted_template.png');

        // --- Thông số căn chỉnh (CỰC KỲ QUAN TRỌNG) ---
        const config = {
            // Khung ảnh đại diện (phần màu trắng bên trong khung gỗ)
            avatar: { x: 70, y: 112, width: 500, height: 356 },

            // Cột bắt đầu cho text (sau chữ NAME: và BERRY:)
            textLeftX: 195,

            // Vị trí Y (độ cao) cho Tên và Tiền (nằm sát TRÊN dòng kẻ)
            nameY: 508,   // Dòng 1
            bountyY: 588, // Dòng 2

            // Chiều rộng tối đa của vùng ghi chữ (để không bị tràn)
            maxTextWidth: 320,

            // Các Font chữ
            fontPath: Jimp.FONT_SANS_32_BLACK
        };

        // 2. Tải các tài nguyên ảnh (Template, Avatar)
        const [template, avatar, font] = await Promise.all([
            Jimp.read(templatePath),
            // Thử tải avatar, nếu lỗi thì tạo ảnh đen
            Jimp.read(avatarUrl).catch(() => new Jimp(500, 500, 0x000000ff)),
            Jimp.loadFont(config.fontPath)
        ]);

        // 3. Xử lý ảnh đại diện (Resize & Filter)
        // Resize để lấp đầy khung nhưng giữ tỷ lệ, sau đó cắt phần thừa
        avatar.cover(config.avatar.width, config.avatar.height);

        // Áp dụng filter (màu nâu đỏ/cổ điển) để khớp với poster cũ
        avatar.sepia();
        avatar.brightness(-0.05); // Giảm sáng một chút cho cũ kỹ
        avatar.contrast(0.1);     // Tăng độ tương phản

        // 4. Ghép ảnh đại diện vào Template
        template.composite(avatar, config.avatar.x, config.avatar.y);

        // 5. Xử lý và Viết chữ (NAME & BOUNTY)
        const nameUpper = name.toUpperCase();
        const bountyFormatted = `${Number(bounty).toLocaleString()}-`;

        // --- HÀM TRỢ GIÚP: Tự động co giãn chữ ---
        async function printAutoScaledText(image, fontObj, x, y, text, maxWidth) {
            let currentFont = fontObj;
            let currentFontSize = 32;

            let textWidth = Jimp.measureText(currentFont, text);

            // Vòng lặp thu nhỏ font nếu chữ quá dài
            while (textWidth > maxWidth && currentFontSize > 12) {
                currentFontSize -= 4;

                if (currentFontSize <= 24 && currentFontSize > 16) {
                    currentFont = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
                } else if (currentFontSize <= 16) {
                    currentFont = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK);
                }

                textWidth = Jimp.measureText(currentFont, text);
            }

            image.print(currentFont, x, y, text);
        }

        // --- Ghi tên ---
        await printAutoScaledText(template, font, config.textLeftX, config.nameY, nameUpper, config.maxTextWidth);

        // --- Ghi số tiền ---
        await printAutoScaledText(template, font, config.textLeftX, config.bountyY, bountyFormatted, config.maxTextWidth);

        // 6. Trả về Buffer thay vì lưu ra file
        return await template.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
        console.error('Lỗi khi tạo poster:', error);
        throw error;
    }
}

// Xuất hàm để sử dụng trong bounty.js
module.exports = { generateWantedPoster };
