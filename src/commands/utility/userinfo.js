const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'userinfo',
    aliases: ['user', 'ui', 'whois'],
    description: 'Xem thông tin chi tiết về người dùng',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
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
        const badges = flags.map(f => badgeMap[f] || `\`${f}\``).join(' ') || t('userinfo.none', lang);

        // Status
        const statusMap = t('userinfo.status_map', lang);
        const status = member?.presence?.status ? statusMap[member.presence.status] : statusMap['offline'];

        // Activity
        const activity = member?.presence?.activities?.[0];
        let activityStr = t('userinfo.none', lang);
        if (activity) {
            const typeMap = t('userinfo.activity_types', lang);
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
            rolesStr = roles.length > 0 ? roles.join(' ') : t('userinfo.none', lang);
            if (rolesStr.length > 900) rolesStr = rolesStr.slice(0, 900) + '...';
        }

        // Permissions (key ones)
        const keyPerms = [];
        if (member) {
            const perms = member.permissions;
            const permMap = t('userinfo.perm_map', lang);

            for (const [key, label] of Object.entries(permMap)) {
                if (perms.has(key)) keyPerms.push(label);
            }
        }
        const permStr = keyPerms.length > 0 ? keyPerms.join(', ') : t('userinfo.std_member', lang);

        // Economy data
        const dbUser = db.getUser(user.id);
        const inventory = JSON.parse(dbUser.inventory || '{}');
        const itemCount = Object.values(inventory).reduce((a, b) => a + b, 0);

        // Nickname
        const nickname = member?.nickname || t('userinfo.none', lang);

        // Highest role color
        const color = member?.displayColor || config.COLORS.NEUTRAL;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(user.bot ? t('userinfo.title_bot', lang) : t('userinfo.title_user', lang))
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: t('userinfo.username', lang), value: `${user.tag}`, inline: true },
                { name: t('userinfo.nickname', lang), value: nickname, inline: true },
                { name: t('userinfo.status', lang), value: status, inline: true },

                { name: t('userinfo.account_created', lang), value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>\n<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: t('userinfo.server_join', lang), value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>\n<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
                { name: t('userinfo.activity', lang), value: activityStr, inline: true },

                { name: t('userinfo.badges', lang), value: badges, inline: false },
                { name: t('userinfo.roles', lang, { count: member ? member.roles.cache.size - 1 : 0 }), value: rolesStr, inline: false },
                { name: t('userinfo.permissions', lang), value: permStr, inline: false },

                { name: t('userinfo.balance', lang), value: t('userinfo.balance_val', lang, { amount: dbUser.balance.toLocaleString() }), inline: true },
                { name: t('userinfo.items', lang), value: t('userinfo.items_val', lang, { count: itemCount }), inline: true },
                { name: t('userinfo.id', lang), value: `\`${user.id}\``, inline: true },
            )
            .setColor(color)
            .setFooter({ text: t('common.requested_by', lang, { user: message.author.tag }) })
            .setTimestamp();

        // Add banner if user has one
        const fetchedUser = await user.fetch(true).catch(() => null);
        if (fetchedUser?.bannerURL()) {
            embed.setImage(fetchedUser.bannerURL({ dynamic: true, size: 1024 }));
        }

        return message.reply({ embeds: [embed] });
    }
};
