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
            ctx.save();

            // --- Hiệu ứng In Ấn Thực Tế ---
            // 4a. Tạo temp canvas để xử lý ảnh (Grayscale/Sepia)
            const tempCanvas = createCanvas(config.avatar.width, config.avatar.height);
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(avatar, 0, 0, config.avatar.width, config.avatar.height);

            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Grayscale (Luminosity)
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                // Áp dụng Sepia nhẹ để hợp với giấy cũ
                data[i] = Math.min(255, gray + 40); // R
                data[i + 1] = Math.min(255, gray + 20); // G
                data[i + 2] = Math.min(255, gray);      // B

                // Thêm nhiễu hạt (Grain) ngẫu nhiên
                const noise = (Math.random() - 0.5) * 30;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
            tempCtx.putImageData(imageData, 0, 0);

            // 4b. Vẽ temp canvas lên main poster
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.92;
            ctx.drawImage(tempCanvas, config.avatar.x, config.avatar.y);

            ctx.restore();
        }

        // 5. Viết chữ (NAME & BOUNTY)
        const nameUpper = name.toUpperCase();
        const bountyFormatted = `${Number(bounty).toLocaleString()}-`;

        // --- Cài đặt font với hiệu ứng Mực Cũ ---
        ctx.fillStyle = 'rgba(26, 17, 8, 0.95)'; // Màu mực nâu đen (off-black)
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

        // 6. Phủ lớp Grain mỏng toàn bộ poster để đồng bộ
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 640;
            const y = Math.random() * 640;
            const size = Math.random() * 2;
            ctx.fillStyle = Math.random() > 0.5 ? 'white' : 'black';
            ctx.fillRect(x, y, size, size);
        }
        ctx.restore();

        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error('Lỗi khi tạo poster (Canvas):', error);
        throw error;
    }
}

module.exports = { generateWantedPoster };
