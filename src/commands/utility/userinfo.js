const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
    name: 'userinfo',
    aliases: ['user', 'ui', 'whois'],
    description: 'Xem thông tin chi tiết về người dùng',
    async execute(message, args) {
        const user = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null)
            || message.author;

        const member = await message.guild.members.fetch(user.id).catch(() => null);

        // Account badges
        const flags = user.flags?.toArray() || [];
        const badgeMap = {
            'ActiveDeveloper': '<:activedev:🧑‍💻>',
            'BugHunterLevel1': '🐛',
            'BugHunterLevel2': '🐛',
            'CertifiedModerator': '🛡️',
            'HypeSquadOnlineHouse1': '🏠', // Bravery
            'HypeSquadOnlineHouse2': '🏠', // Brilliance
            'HypeSquadOnlineHouse3': '🏠', // Balance
            'Hypesquad': '🎉',
            'Partner': '👑',
            'PremiumEarlySupporter': '⭐',
            'Staff': '⚙️',
            'VerifiedDeveloper': '✅',
            'VerifiedBot': '🤖',
            'Nitro': '💎',
        };
        const badges = flags.map(f => badgeMap[f] || `\`${f}\``).join(' ') || 'Không có';

        // Status
        const statusMap = {
            'online': '🟢 Trực tuyến',
            'idle': '🌙 Chờ',
            'dnd': '⛔ Không làm phiền',
            'offline': '⚫ Ngoại tuyến',
        };
        const status = member?.presence?.status ? statusMap[member.presence.status] : '⚫ Ngoại tuyến';

        // Activity
        const activity = member?.presence?.activities?.[0];
        let activityStr = 'Không có';
        if (activity) {
            const typeMap = { 0: 'Đang chơi', 1: 'Đang phát trực tiếp', 2: 'Đang nghe', 3: 'Đang xem', 4: 'Trạng thái tùy chỉnh', 5: 'Đang thi đấu' };
            const prefix = typeMap[activity.type] || '';
            activityStr = activity.type === 4
                ? `${activity.emoji?.toString() || ''} ${activity.state || ''}`.trim()
                : `${prefix} **${activity.name}**`;
        }

        // Roles (sorted by position, top 20)
        let rolesStr = 'N/A';
        if (member) {
            const roles = member.roles.cache
                .filter(r => r.id !== message.guild.id)
                .sort((a, b) => b.position - a.position)
                .first(20)
                .map(r => `${r}`);
            rolesStr = roles.length > 0 ? roles.join(' ') : 'Không có';
            if (rolesStr.length > 900) rolesStr = rolesStr.slice(0, 900) + '...';
        }

        // Permissions (key ones)
        const keyPerms = [];
        if (member) {
            const perms = member.permissions;
            if (perms.has('Administrator')) keyPerms.push('👑 Quản trị viên');
            if (perms.has('ManageGuild')) keyPerms.push('⚙️ Quản lý máy chủ');
            if (perms.has('ManageChannels')) keyPerms.push('📝 Quản lý kênh');
            if (perms.has('ManageRoles')) keyPerms.push('🎭 Quản lý vai trò');
            if (perms.has('ManageMessages')) keyPerms.push('💬 Quản lý tin nhắn');
            if (perms.has('BanMembers')) keyPerms.push('🔨 Ban thành viên');
            if (perms.has('KickMembers')) keyPerms.push('👢 Kick thành viên');
            if (perms.has('MentionEveryone')) keyPerms.push('📢 Nhắc tên mọi người');
        }
        const permStr = keyPerms.length > 0 ? keyPerms.join(', ') : 'Thành viên tiêu chuẩn';

        // Economy data
        const dbUser = db.getUser(user.id);
        const inventory = JSON.parse(dbUser.inventory || '{}');
        const itemCount = Object.values(inventory).reduce((a, b) => a + b, 0);

        // Nickname
        const nickname = member?.nickname || 'Không có';

        // Highest role color
        const color = member?.displayColor || config.COLORS.NEUTRAL;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`${user.bot ? '🤖' : '👤'}  Thông tin người dùng`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '📛 Tên người dùng', value: `${user.tag}`, inline: true },
                { name: '🏷️ Biệt danh', value: nickname, inline: true },
                { name: '📊 Trạng thái', value: status, inline: true },

                { name: '📅 Ngày tạo tài khoản', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>\n<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Tham gia máy chủ', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>\n<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
                { name: '🎮 Hoạt động', value: activityStr, inline: true },

                { name: '🏅 Huy hiệu (Badges)', value: badges, inline: false },
                { name: `🎭 Vai trò [${member ? member.roles.cache.size - 1 : 0}]`, value: rolesStr, inline: false },
                { name: '🔑 Quyền hạn chính', value: permStr, inline: false },

                { name: '💰 Số dư', value: `**${dbUser.balance.toLocaleString()}** coins`, inline: true },
                { name: '🎒 Vật phẩm', value: `**${itemCount}** vật phẩm`, inline: true },
                { name: '🆔 ID người dùng', value: `\`${user.id}\``, inline: true },
            )
            .setColor(color)
            .setFooter({ text: `Yêu cầu bởi ${message.author.tag}` })
            .setTimestamp();

        // Add banner if user has one
        const fetchedUser = await user.fetch(true).catch(() => null);
        if (fetchedUser?.bannerURL()) {
            embed.setImage(fetchedUser.bannerURL({ dynamic: true, size: 1024 }));
        }

        return message.reply({ embeds: [embed] });
    }
};
