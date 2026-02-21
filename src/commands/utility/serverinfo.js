const { EmbedBuilder, ChannelType } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'serverinfo',
    aliases: ['server', 'si'],
    description: 'Hiển thị thông tin máy chủ',
    async execute(message) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const guild = message.guild;
        const owner = await guild.fetchOwner().catch(() => null);

        // Try to fetch members (requires GuildMembers intent)
        try { await guild.members.fetch(); } catch { /* Intent not enabled */ }

        // Channel breakdown
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const forums = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
        const stages = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;

        // Member breakdown
        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
        const idle = guild.members.cache.filter(m => m.presence?.status === 'idle').size;
        const dnd = guild.members.cache.filter(m => m.presence?.status === 'dnd').size;

        // Boost info
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostLabels = t('serverinfo.boost_levels', lang);

        // Emoji & Sticker count
        const emojis = guild.emojis.cache.size;
        const animated = guild.emojis.cache.filter(e => e.animated).size;
        const stickers = guild.stickers.cache.size;

        // Roles (top 15)
        const roles = guild.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .first(15)
            .map(r => `${r}`)
            .join(' ');
        const roleCount = guild.roles.cache.size - 1;

        // Verification level
        const verificationLevels = t('serverinfo.verification_levels', lang);
        const verificationLevel = verificationLevels[guild.verificationLevel] || t('serverinfo.unknown', lang);

        const embed = new EmbedBuilder()
            .setTitle(t('serverinfo.title', lang, { name: guild.name }))
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: t('serverinfo.owner', lang), value: owner ? `${owner.user.tag}\n${owner.user}` : t('serverinfo.unknown', lang), inline: true },
                { name: t('serverinfo.created', lang), value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>\n<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: t('serverinfo.verification', lang), value: `${verificationLevel}`, inline: true },

                { name: t('serverinfo.members', lang, { total: totalMembers }), value: t('serverinfo.member_stats', lang, { humans, bots, online, idle, dnd }), inline: false },

                {
                    name: t('serverinfo.channels', lang, { total: guild.channels.cache.size }),
                    value: t('serverinfo.channel_stats', lang, {
                        text: textChannels,
                        voice: voiceChannels,
                        categories,
                        extra: (forums || stages) ? t('serverinfo.extra_channels', lang, { forums, stages }) : ''
                    }),
                    inline: false
                },

                { name: t('serverinfo.boost', lang), value: t('serverinfo.boost_stats', lang, { level: boostLabels[boostLevel], count: boostCount }), inline: true },
                { name: t('serverinfo.emojis', lang, { total: emojis }), value: t('serverinfo.emoji_stats', lang, { static: emojis - animated, animated, stickers }), inline: true },
                { name: t('serverinfo.roles', lang, { count: roleCount }), value: roles.length > 0 ? (roles.length > 900 ? roles.slice(0, 900) + '...' : roles) : t('serverinfo.none', lang), inline: false },
            )
            .setColor(config.COLORS.SCHEDULED)
            .setFooter({ text: t('serverinfo.footer', lang, { id: guild.id }) })
            .setTimestamp();

        // Add banner if exists
        const banner = guild.bannerURL({ size: 1024 });
        if (banner) embed.setImage(banner);

        return message.reply({ embeds: [embed] });
    }
};
