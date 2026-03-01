
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'avatar',
    aliases: ['avt'],
    description: 'Ảnh đại diện (User avatar)',
    skipXp: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null)
            || message.author;

        const member = await message.guild.members.fetch(user.id).catch(() => null);

        const globalExt = user.avatar?.startsWith('a_') ? 'gif' : 'png';
        let globalAvatar = user.displayAvatarURL({ extension: globalExt, size: 1024 });

        const isBot = user.id === message.client.user.id;
        const customBotPng = 'https://cdn.discordapp.com/attachments/1364430739512496228/1477518057118109756/simsimi_avatar_1024x1024.png?ex=69a50d6b&is=69a3bbeb&hm=4708ffa10df26fdcf3d0e8d12480bbd0d42a8a03cc7992d2b584d11184efc641&';

        if (isBot) {
            globalAvatar = customBotPng;
        }

        const serverExt = member?.avatar?.startsWith('a_') ? 'gif' : 'png';
        const serverAvatar = member?.avatar ? member.displayAvatarURL({ extension: serverExt, size: 1024 }) : null;
        const hasServerAvatar = !!serverAvatar;

        // Format links for different sizes
        // Format links explicitly at maximum size
        const isAnimated = user.avatar?.startsWith('a_') || false;
        const formats = ['png', 'jpg'];
        if (isAnimated) formats.push('gif');
        else formats.push('webp');

        const links = formats.map(f => {
            let url = user.displayAvatarURL({ extension: f, forceStatic: false, size: 1024 });
            if (isBot && f === 'png') url = customBotPng;
            return `[${f.toUpperCase()}](${url})`;
        }).join(' • ');

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.tag}`, iconURL: globalAvatar })
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
            const bannerExt = fetchedUser.banner?.startsWith('a_') ? 'gif' : 'png';
            const bannerUrl = fetchedUser.bannerURL({ extension: bannerExt, size: 1024 });
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
