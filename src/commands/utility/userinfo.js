const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
    name: 'userinfo',
    aliases: ['user', 'ui', 'whois'],
    description: 'View detailed user information',
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
        const badges = flags.map(f => badgeMap[f] || `\`${f}\``).join(' ') || 'None';

        // Status
        const statusMap = {
            'online': '🟢 Online',
            'idle': '🌙 Idle',
            'dnd': '⛔ Do Not Disturb',
            'offline': '⚫ Offline',
        };
        const status = member?.presence?.status ? statusMap[member.presence.status] : '⚫ Offline';

        // Activity
        const activity = member?.presence?.activities?.[0];
        let activityStr = 'None';
        if (activity) {
            const typeMap = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 4: 'Custom', 5: 'Competing in' };
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
            rolesStr = roles.length > 0 ? roles.join(' ') : 'None';
            if (rolesStr.length > 900) rolesStr = rolesStr.slice(0, 900) + '...';
        }

        // Permissions (key ones)
        const keyPerms = [];
        if (member) {
            const perms = member.permissions;
            if (perms.has('Administrator')) keyPerms.push('👑 Admin');
            if (perms.has('ManageGuild')) keyPerms.push('⚙️ Manage Server');
            if (perms.has('ManageChannels')) keyPerms.push('📝 Manage Channels');
            if (perms.has('ManageRoles')) keyPerms.push('🎭 Manage Roles');
            if (perms.has('ManageMessages')) keyPerms.push('💬 Manage Messages');
            if (perms.has('BanMembers')) keyPerms.push('🔨 Ban Members');
            if (perms.has('KickMembers')) keyPerms.push('👢 Kick Members');
            if (perms.has('MentionEveryone')) keyPerms.push('📢 Mention Everyone');
        }
        const permStr = keyPerms.length > 0 ? keyPerms.join(', ') : 'Standard';

        // Economy data
        const dbUser = db.getUser(user.id);
        const inventory = JSON.parse(dbUser.inventory || '{}');
        const itemCount = Object.values(inventory).reduce((a, b) => a + b, 0);

        // Nickname
        const nickname = member?.nickname || 'None';

        // Highest role color
        const color = member?.displayColor || config.COLORS.NEUTRAL;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`${user.bot ? '🤖' : '👤'}  User Info`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '📛 Username', value: `${user.tag}`, inline: true },
                { name: '🏷️ Nickname', value: nickname, inline: true },
                { name: '📊 Status', value: status, inline: true },

                { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>\n<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>\n<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
                { name: '🎮 Activity', value: activityStr, inline: true },

                { name: '🏅 Badges', value: badges, inline: false },
                { name: `🎭 Roles [${member ? member.roles.cache.size - 1 : 0}]`, value: rolesStr, inline: false },
                { name: '🔑 Key Permissions', value: permStr, inline: false },

                { name: '💰 Balance', value: `**${dbUser.balance.toLocaleString()}** coins`, inline: true },
                { name: '🎒 Items', value: `**${itemCount}** items`, inline: true },
                { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
            )
            .setColor(color)
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();

        // Add banner if user has one
        const fetchedUser = await user.fetch(true).catch(() => null);
        if (fetchedUser?.bannerURL()) {
            embed.setImage(fetchedUser.bannerURL({ dynamic: true, size: 1024 }));
        }

        return message.reply({ embeds: [embed] });
    }
};
