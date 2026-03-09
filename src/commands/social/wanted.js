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

        // Get bounty amount
        let bounty = args[1] || Math.floor(Math.random() * 1000000).toLocaleString();

        const statusMsg = await message.reply(t('social.wanted.searching', lang, { user: target.username }));

        try {
            const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 512 });
            const wantedUrl = `https://some-random-api.com/canvas/overlay/wanted?avatar=${encodeURIComponent(avatarUrl)}`;

            const embed = new EmbedBuilder()
                .setTitle(t('social.wanted.title', lang, { user: target.username }))
                .setDescription(t('social.wanted.description', lang, {
                    bounty,
                    emoji: config.EMOJIS.COIN
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
