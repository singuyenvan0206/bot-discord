const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    aliases: ['server', 'si'],
    description: 'View detailed server information',
    async execute(message, args) {
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
        const boostLabels = ['None', 'Level 1', 'Level 2', 'Level 3'];

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
        const verificationLevels = ['None', 'Low', 'Medium', 'High', 'Very High'];
        const verificationLevel = verificationLevels[guild.verificationLevel] || 'Unknown';

        const embed = new EmbedBuilder()
            .setTitle(`📊  ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👑 Owner', value: owner ? `${owner.user.tag}\n${owner.user}` : 'Unknown', inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>\n<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🔒 Verification', value: `${verificationLevel}`, inline: true },

                { name: `👥 Members (${totalMembers})`, value: `👤 Humans: **${humans}**\n🤖 Bots: **${bots}**\n🟢 Online: **${online}** | 🌙 Idle: **${idle}** | ⛔ DND: **${dnd}**`, inline: false },

                { name: `💬 Channels (${guild.channels.cache.size})`, value: `📝 Text: **${textChannels}** | 🔊 Voice: **${voiceChannels}**\n📁 Categories: **${categories}**${forums ? ` | 📋 Forums: **${forums}**` : ''}${stages ? ` | 🎤 Stages: **${stages}**` : ''}`, inline: false },

                { name: `🚀 Boosts`, value: `Level: **${boostLabels[boostLevel]}**\nBoosts: **${boostCount}**`, inline: true },
                { name: `😄 Emojis (${emojis})`, value: `Static: **${emojis - animated}** | Animated: **${animated}**\n🏷️ Stickers: **${stickers}**`, inline: true },
                { name: `🎭 Roles (${roleCount})`, value: roles.length > 0 ? (roles.length > 900 ? roles.slice(0, 900) + '...' : roles) : 'None', inline: false },
            )
            .setColor(0x9B59B6)
            .setFooter({ text: `Server ID: ${guild.id}` })
            .setTimestamp();

        // Add banner if exists
        const banner = guild.bannerURL({ size: 1024 });
        if (banner) embed.setImage(banner);

        return message.reply({ embeds: [embed] });
    }
};
