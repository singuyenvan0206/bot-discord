const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

/**
 * Generates a One Piece style wanted poster
 * @param {string} avatarUrl - URL to the user's avatar
 * @param {string} name - User's display name
 * @param {number|string} bounty - Bounty amount
 * @returns {Promise<Buffer>} - The generated image buffer
 */
async function generateWantedPoster(avatarUrl, name, bounty) {
    try {
        const templatePath = path.join(__dirname, '../assets/wanted_template.png');

        // Load template and avatar
        const [template, avatar] = await Promise.all([
            Jimp.read(templatePath),
            Jimp.read(avatarUrl).catch(() => Jimp.read(path.join(__dirname, '../assets/default_avatar.png')).catch(() => new Jimp(500, 500, 0x000000ff)))
        ]);

        // 1. Process Avatar
        // Resize avatar to fit the frame in the 640x640 template
        const avatarWidth = 360;
        const avatarHeight = 260;
        avatar.cover(avatarWidth, avatarHeight);

        // Apply a slight sepia/old paper filter to the avatar
        avatar.sepia().brightness(-0.1).contrast(0.1);

        // 2. Composite Avatar onto Template
        // Centering horizontally, and placing vertically within the frame
        const avatarX = (template.getWidth() - avatarWidth) / 2;
        const avatarY = 175;
        template.composite(avatar, avatarX, avatarY);

        // 3. Add Name and Bounty Text
        const titleFont = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        const bountyFont = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

        // Center name below the frame
        const nameUpper = name.toUpperCase();
        const nameWidth = Jimp.measureText(titleFont, nameUpper);
        template.print(titleFont, (template.getWidth() - nameWidth) / 2, 500, nameUpper);

        // Add bounty amount at the very bottom
        const bountyText = `B ${Number(bounty).toLocaleString()}-`;
        const bountyWidth = Jimp.measureText(bountyFont, bountyText);
        template.print(bountyFont, (template.getWidth() - bountyWidth) / 2, 565, bountyText);

        return await template.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
        console.error('Error generating wanted poster:', error);
        throw error;
    }
}

module.exports = { generateWantedPoster };
