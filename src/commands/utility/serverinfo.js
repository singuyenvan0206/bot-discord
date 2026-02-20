const { EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config');

module.exports = {
    name: 'serverinfo',
    aliases: ['server', 'si'],
    description: 'Xem thông tin chi tiết về máy chủ',
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
        const boostLabels = ['Không có', 'Cấp 1', 'Cấp 2', 'Cấp 3'];

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
        const verificationLevels = ['Không có', 'Thấp', 'Trung bình', 'Cao', 'Rất cao'];
        const verificationLevel = verificationLevels[guild.verificationLevel] || 'Không rõ';

        const embed = new EmbedBuilder()
            .setTitle(`📊  Thông tin máy chủ: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👑 Chủ sở hữu', value: owner ? `${owner.user.tag}\n${owner.user}` : 'Không rõ', inline: true },
                { name: '📅 Ngày tạo', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>\n<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🔒 Xác minh', value: `${verificationLevel}`, inline: true },

                { name: `👥 Thành viên (${totalMembers})`, value: `👤 Người: **${humans}**\n🤖 Bot: **${bots}**\n🟢 Trực tuyến: **${online}** | 🌙 Chờ: **${idle}** | ⛔ DND: **${dnd}**`, inline: false },

                { name: `💬 Kênh (${guild.channels.cache.size})`, value: `📝 Văn bản: **${textChannels}** | 🔊 Thoại: **${voiceChannels}**\n📁 Danh mục: **${categories}**${forums ? ` | 📋 Diễn đàn: **${forums}**` : ''}${stages ? ` | 🎤 Sân khấu: **${stages}**` : ''}`, inline: false },

                { name: `🚀 Tăng cường (Boost)`, value: `Cấp độ: **${boostLabels[boostLevel]}**\nSố lượt: **${boostCount}**`, inline: true },
                { name: `😄 Biểu tượng (${emojis})`, value: `Tĩnh: **${emojis - animated}** | Động: **${animated}**\n🏷️ Sticker: **${stickers}**`, inline: true },
                { name: `🎭 Vai trò (${roleCount})`, value: roles.length > 0 ? (roles.length > 900 ? roles.slice(0, 900) + '...' : roles) : 'Không có', inline: false },
            )
            .setColor(config.COLORS.SCHEDULED)
            .setFooter({ text: `ID Máy chủ: ${guild.id}` })
            .setTimestamp();

        // Add banner if exists
        const banner = guild.bannerURL({ size: 1024 });
        if (banner) embed.setImage(banner);

        return message.reply({ embeds: [embed] });
    }
};
