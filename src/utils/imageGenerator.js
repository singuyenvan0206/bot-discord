const Jimp = require('jimp');
const path = require('path');

/**
 * Tạo Wanted Poster One Piece với tính năng tự động căn chỉnh và co giãn chữ.
 * * @param {string} avatarUrl - Đường dẫn đến ảnh đại diện (file local hoặc URL)
 * @param {string} name - Tên nhân vật (ví dụ: 'Zoro', 'Monkey D. Luffy')
 * @param {number|string} bounty - Số tiền thưởng (ví dụ: 300000000)
 * @param {string} outputPath - Đường dẫn để lưu file ảnh đầu ra (ví dụ: './output.png')
 */
async function generateOnePieceWantedPoster(avatarUrl, name, bounty, outputPath) {
    try {
        console.log('--- Đang bắt đầu tạo poster ---');

        // 1. Định nghĩa đường dẫn và thông số kỹ thuật (Dựa trên template chuẩn 640x640)
        // Lưu ý: Hãy đảm bảo bạn có file 'wanted_template.png' (ảnh trống) cùng thư mục với file code này.
        const templatePath = path.join(__dirname, 'wanted_template.png');
        const defaultAvatarPath = path.join(__dirname, 'default_avatar.png'); // Ảnh dự phòng nếu load avatar lỗi

        // --- Thông số căn chỉnh (CỰC KỲ QUAN TRỌNG) ---
        const config = {
            // Khung ảnh đại diện (phần màu trắng bên trong khung gỗ)
            avatar: { x: 70, y: 112, width: 500, height: 356 },
            
            // Cột bắt đầu cho text (sau chữ NAME: và BERRY:)
            textLeftX: 250, 
            
            // Vị trí Y (độ cao) cho Tên và Tiền (nằm sát TRÊN dòng kẻ)
            nameY: 742,   // Dòng 1
            bountyY: 832, // Dòng 2
            
            // Chiều rộng tối đa của vùng ghi chữ (để không bị tràn)
            maxTextWidth: 320, 
            
            // Các Font chữ (Tải font lớn nhất bạn muốn dùng làm chuẩn ban đầu)
            // Khuyên dùng font ttf/fnt tùy chỉnh cho giống Anime, ở đây dùng tạm font Sans serif của Jimp.
            fontPath: Jimp.FONT_SANS_32_BLACK // Hoặc đường dẫn tới file .fnt của bạn
        };

        // 2. Tải các tài nguyên ảnh (Template, Avatar)
        console.log('1. Đang tải ảnh nền và avatar...');
        const [template, avatar, font] = await Promise.all([
            Jimp.read(templatePath),
            // Thử tải avatar, nếu lỗi thì dùng ảnh mặc định, nếu vẫn lỗi thì tạo ảnh đen
            Jimp.read(avatarUrl).catch(() => Jimp.read(defaultAvatarPath).catch(() => new Jimp(500, 500, 0x000000ff))),
            Jimp.loadFont(config.fontPath)
        ]);

        // 3. Xử lý ảnh đại diện (Resize & Filter)
        console.log('2. Đang xử lý ảnh đại diện...');
        // Resize để lấp đầy khung nhưng giữ tỷ lệ, sau đó cắt phần thừa
        avatar.cover(config.avatar.width, config.avatar.height);

        // Áp dụng filter (màu nâu đỏ/cổ điển) để khớp với poster cũ
        avatar.sepia(); 
        avatar.brightness(-0.05); // Giảm sáng một chút cho cũ kỹ
        avatar.contrast(0.1);     // Tăng độ tương phản

        // 4. Ghép ảnh đại diện vào Template
        console.log('3. Đang ghép ảnh đại diện...');
        template.composite(avatar, config.avatar.x, config.avatar.y);

        // 5. Xử lý và Viết chữ (NAME & BOUNTY) - CĂN CHỈNH & AUTO-SCALE TẠI ĐÂY
        console.log('4. Đang xử lý và ghi chữ (Tên & Tiền)...');

        // --- Định dạng dữ liệu ---
        const nameUpper = name.toUpperCase();
        // Định dạng số tiền: thêm dấu phẩy và ký tự '-' ở cuối (ví dụ: 1,200,000,000-)
        const bountyFormatted = `${Number(bounty).toLocaleString()}-`;


        // --- HÀM TRỢ GIÚP: Tự động co giãn chữ ---
        /**
         * Đo và in chữ, tự động thu nhỏ nếu quá dài.
         */
        async function printAutoScaledText(image, fontObj, x, y, text, maxWidth, colorFontPath) {
            let currentFont = fontObj;
            let currentFontSize = 32; // Kích thước bắt đầu (khớp với FONT_SANS_32)

            // Đo chiều rộng hiện tại của chữ
            let textWidth = Jimp.measureText(currentFont, text);

            // Vòng lặp thu nhỏ font nếu chữ quá dài
            while (textWidth > maxWidth && currentFontSize > 12) { // Giới hạn nhỏ nhất là size 12
                currentFontSize -= 2; // Giảm size mỗi lần 2 đơn vị
                
                // Trực tiếp dùng scale() của Jimp trên đối tượng font không hiệu quả. 
                // Cách chuẩn là tải một font nhỏ hơn. 
                // TRONG JIMP LOCAL: Ta sẽ sử dụng font bé hơn có sẵn.
                if (currentFontSize <= 24 && currentFontSize > 16) {
                    currentFont = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK); // Font tạm
                } else if (currentFontSize <= 16) {
                    currentFont = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK); // Font rất nhỏ
                }
                
                // Do hạn chế của Jimp với các size font cố định, việc auto-scale mịn màng 
                // yêu cầu bạn phải chuẩn bị sẵn nhiều file font .fnt khác nhau.
                // Ở đây ta mô phỏng bằng cách nhảy font.
                
                textWidth = Jimp.measureText(currentFont, text);
            }

            // Cuối cùng, in chữ đã được co giãn (hoặc nhảy font)
            image.print(currentFont, x, y, text);
        }
        // ----------------------------------------


        // --- Ghi tên (có Auto-scale) ---
        // Sử dụng một font bitmap tùy chỉnh (file .fnt) sẽ cho kết quả auto-scale tốt hơn font mặc định.
        // Ở đây tôi dùng font Sans chuẩn để bạn chạy được ngay.
        await printAutoScaledText(template, font, config.textLeftX, config.nameY, nameUpper, config.maxTextWidth, config.fontPath);

        // --- Ghi số tiền (có Auto-scale, cùng cột với Tên) ---
        await printAutoScaledText(template, font, config.textLeftX, config.bountyY, bountyFormatted, config.maxTextWidth, config.fontPath);


        // 6. Xuất ảnh ra file
        console.log(`5. Đang xuất ảnh ra: ${outputPath}`);
        await template.writeAsync(outputPath);

        console.log('--- HOÀN THÀNH ---');
        return true;
    } catch (error) {
        console.error('Lỗi khi tạo poster:', error);
        throw error;
    }
}

// ==========================================
// Ví dụ cách sử dụng (Bạn có thể copy đoạn này vào file khác)
// ==========================================
/*
const avatar = 'https://i.imgur.com/your-grumpy-bunny.png'; // Link ảnh Bunny của bạn
const name = 'Zoe.27'; 
const bounty = 1200000000;
const output = './final_wanted_poster.png';

generateOnePieceWantedPoster(avatar, name, bounty, output)
    .then(() => console.log('Đã tạo xong poster! Kiểm tra file final_wanted_poster.png'))
    .catch(err => console.error('Tạo poster thất bại:', err));
*/

// Xuất hàm để sử dụng ở nơi khác
module.exports = { generateOnePieceWantedPoster };