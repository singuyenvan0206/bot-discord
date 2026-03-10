const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// Đăng ký font mới (Sử dụng đường dẫn tuyệt đối cho canvas)
const fontPath = path.resolve(__dirname, '..', 'assets', 'WantedFont.ttf');
registerFont(fontPath, { family: 'WantedFont' });

/**
 * Tạo Wanted Poster One Piece với Canvas để hỗ trợ font serif (.ttf) chuyên nghiệp.
 * @param {string} avatarUrl - Đường dẫn đến ảnh đại diện
 * @param {string} name - Tên nhân vật
 * @param {number|string} bounty - Số tiền thưởng
 * @returns {Promise<Buffer>} - Trả về buffer ảnh PNG
 */
async function generateWantedPoster(avatarUrl, name, bounty) {
    try {
        const templatePath = path.resolve(__dirname, '..', 'assets', 'wanted_template.png');

        // --- Thông số căn chỉnh (Dựa trên template 640x640 và điều chỉnh của user) ---
        const config = {
            avatar: { x: 166, y: 187, width: 315, height: 215 },
            name: { x: 285, y: 475, maxWidth: 280, fontSize: 40 }, // Y được điều chỉnh cho canvas
            bounty: { x: 360, y: 533, maxWidth: 180, fontSize: 32 }
        };

        // 1. Tải tài nguyên (Sử dụng Buffer cho local file để tránh lỗi fopen trên Windows)
        const fs = require('fs');
        const https = require('https');

        const fetchBuffer = (url) => new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to fetch: ${res.statusCode}`));
                    return;
                }
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', reject);
            }).on('error', reject);
        });

        const template = await loadImage(fs.readFileSync(templatePath));
        let avatar = null;

        if (avatarUrl) {
            try {
                if (avatarUrl.startsWith('http')) {
                    const buffer = await fetchBuffer(avatarUrl);
                    avatar = await loadImage(buffer);
                } else {
                    const avatarPath = path.resolve(avatarUrl);
                    if (fs.existsSync(avatarPath)) {
                        avatar = await loadImage(fs.readFileSync(avatarPath));
                    }
                }
            } catch (err) {
                console.error('Lỗi tải avatar:', err.message);
            }
        }

        // 2. Tạo canvas
        const canvas = createCanvas(640, 640);
        const ctx = canvas.getContext('2d');

        // 3. Vẽ Template nền
        ctx.drawImage(template, 0, 0, 640, 640);

        // 4. Vẽ Avatar với hiệu ứng cuộn (Blend mode để "remove background" của avatar)
        if (avatar) {
            console.log('Đang vẽ avatar:', avatarUrl);
            ctx.save();

            // Sử dụng hiệu ứng hòa trộn Multiply để avatar như in trên giấy
            // Điều này hiệu quả nhất để "xóa nền" trắng hoặc sáng của ảnh đại diện
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.95;

            ctx.drawImage(avatar, config.avatar.x, config.avatar.y, config.avatar.width, config.avatar.height);
            ctx.restore();
        } else {
            console.warn('Không có avatar để vẽ!');
        }

        // 5. Viết chữ (NAME & BOUNTY)
        const nameUpper = name.toUpperCase();
        const bountyFormatted = `${Number(bounty).toLocaleString()}-`;

        // --- Cài đặt font ---
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';

        // Viết Tên
        ctx.font = `bold ${config.name.fontSize}px "WantedFont", serif`;
        let currentNameSize = config.name.fontSize;
        while (ctx.measureText(nameUpper).width > config.name.maxWidth && currentNameSize > 12) {
            currentNameSize -= 2;
            ctx.font = `bold ${currentNameSize}px "WantedFont", serif`;
        }
        ctx.fillText(nameUpper, config.name.x, config.name.y);

        // Viết Bounty
        ctx.font = `bold ${config.bounty.fontSize}px "WantedFont", serif`;
        let currentBountySize = config.bounty.fontSize;
        while (ctx.measureText(bountyFormatted).width > config.bounty.maxWidth && currentBountySize > 12) {
            currentBountySize -= 2;
            ctx.font = `bold ${currentBountySize}px "WantedFont", serif`;
        }
        ctx.fillText(bountyFormatted, config.bounty.x, config.bounty.y);

        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error('Lỗi khi tạo poster (Canvas):', error);
        throw error;
    }
}

module.exports = { generateWantedPoster };
