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
        // Resize avatar to fit the frame (approximate coordinates for the template I generated)
        // Template frame is roughly in the middle. Let's aim for a good fit.
        // We'll resize avatar to ~560x420 or similar based on typical OP poster ratios.
        avatar.resize(600, 450);
        // Apply a slight sepia/old paper filter to the avatar to match the poster
        avatar.sepia().brightness(-0.1).contrast(0.1);

        // 2. Composite Avatar onto Template
        // Positioning: x=100, y=250 (Adjusted based on standard OP poster layout)
        // These coords are guesses for the generated template, might need slight tuning.
        template.composite(avatar, 135, 275);

        // 3. Add Name and Bounty Text
        // We'll use Jimp's built-in fonts for simplicity, or load a custom one if needed.
        const titleFont = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
        const bountyFont = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

        // Center name at the bottom
        const nameUpper = name.toUpperCase();
        const nameWidth = Jimp.measureText(titleFont, nameUpper);
        template.print(titleFont, (template.getWidth() - nameWidth) / 2, 820, nameUpper);

        // Add bounty amount at the very bottom
        const bountyText = `B ${Number(bounty).toLocaleString()}-`;
        const bountyWidth = Jimp.measureText(bountyFont, bountyText);
        template.print(bountyFont, (template.getWidth() - bountyWidth) / 2, 920, bountyText);

        return await template.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
        console.error('Error generating wanted poster:', error);
        throw error;
    }
}

module.exports = { generateWantedPoster };
