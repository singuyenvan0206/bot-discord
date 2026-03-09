const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'wanted',
    aliases: ['wnt'],
    description: 'Tạo ảnh truy nã (Create a wanted poster)',
    category: 'social',
    usage: '<@user> [bounty]',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        // Get target user
        let target = message.mentions.users.first();
        if (!target && args[0]) {
            target = await message.client.users.fetch(args[0]).catch(() => null);
        }
        if (!target) target = message.author;

        // Get bounty or stars from args[1]
        let stars = 1;
        let bounty = 0;
        let input = args[1]?.replace(/,/g, '');

        if (input) {
            const val = parseInt(input);
            if (!isNaN(val)) {
                if (val >= 1 && val <= 5 && input.length === 1) {
                    stars = val;
                } else {
                    bounty = val;
                    // Calculate stars based on bounty
                    const threshold = config.WANTED.BOUNTY_THRESHOLDS.find(t => bounty >= t.min);
                    stars = threshold ? threshold.stars : 1;
                }
            }
        }

        // If bounty was not set (because stars were provided), generate a representative one
        if (bounty === 0) {
            bounty = config.WANTED.BOUNTY_THRESHOLDS.find(t => t.stars === stars)?.min || 1000;
        }

        const duration = config.WANTED.DURATIONS[stars] || 3600;
        const expiresAt = Math.floor(Date.now() / 1000) + duration;

        const statusMsg = await message.reply(t('social.wanted.searching', lang, { user: target.username }));

        try {
            // Update Database
            const { updateUser } = require('../../database');
            await updateUser(target.id, {
                wanted_level: stars,
                bounty: bounty,
                wanted_expires_at: expiresAt
            });

            const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 512 });
            const wantedUrl = `https://some-random-api.com/canvas/overlay/wanted?avatar=${encodeURIComponent(avatarUrl)}`;

            const starString = '⭐'.repeat(stars);
            const timeString = `<t:${expiresAt}:R>`;

            const embed = new EmbedBuilder()
                .setTitle(t('social.wanted.title', lang, { user: target.username }))
                .setDescription(t('social.wanted.description', lang, {
                    bounty: bounty.toLocaleString(),
                    emoji: config.EMOJIS.COIN,
                    stars: starString,
                    expires: timeString
                }))
                .setImage(wantedUrl)
                .setColor(config.COLORS.INFO)
                .setTimestamp();

            await statusMsg.edit({ content: null, embeds: [embed] });
        } catch (error) {
            console.error('Wanted Command Error:', error);
            await statusMsg.edit(t('social.wanted.not_found', lang));
        }
    }
};
