const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    description: 'Xem ảnh đại diện của người dùng với độ phân giải cao',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null)
            || message.author;

        const member = await message.guild.members.fetch(user.id).catch(() => null);

        const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 4096 });
        const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });
        const hasServerAvatar = serverAvatar && serverAvatar !== globalAvatar;

        // Format links for different sizes
        const sizes = [128, 256, 512, 1024, 4096];
        const links = sizes.map(s => `[\`${s}px\`](${user.displayAvatarURL({ dynamic: true, size: s })})`).join(' • ');

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(t('avatar.title', lang))
            .setImage(globalAvatar)
            .addFields(
                { name: t('avatar.download', lang), value: links, inline: false },
            )
            .setColor(member?.displayColor || config.COLORS.INFO)
            .setFooter({ text: t('common.requested_by', lang, { user: message.author.tag }) })
            .setTimestamp();

        const components = [];

        // Add button for server avatar if different
        if (hasServerAvatar) {
            embed.addFields(
                { name: t('avatar.server_avatar', lang), value: t('avatar.server_avatar_link', lang, { url: serverAvatar }), inline: true }
            );
        }

        // Check for banner
        const fetchedUser = await user.fetch(true).catch(() => null);
        if (fetchedUser?.bannerURL()) {
            const bannerUrl = fetchedUser.bannerURL({ dynamic: true, size: 4096 });
            embed.addFields(
                { name: t('avatar.banner', lang), value: t('avatar.banner_link', lang, { url: bannerUrl }), inline: true }
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(t('avatar.view_banner', lang))
                    .setStyle(ButtonStyle.Link)
                    .setURL(bannerUrl)
                    .setEmoji('🎨')
            );
            components.push(row);
        }

        const replyOptions = { embeds: [embed] };
        if (components.length > 0) replyOptions.components = components;

        return message.reply(replyOptions);
    }
};
