const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { calculateNetWorth } = require('../../utils/economy');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'Hiển thị 10 người giàu nhất trên máy chủ này',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        // Fetch top 100 users by balance as a proxy for net worth
        const topUsers = db.getTopUsers(100, 'balance');
        const guildMembers = [];

        for (const u of topUsers) {
            if (guildMembers.length >= 10) break;

            try {
                let member = message.guild.members.cache.get(u.id);
                if (!member) {
                    member = await message.guild.members.fetch(u.id).catch(() => null);
                }

                if (member) {
                    // Calculate precise net worth including inventory
                    const netWorth = calculateNetWorth(u);
                    guildMembers.push({
                        username: member.user.username,
                        netWorth: netWorth,
                        userId: u.id
                    });
                }
            } catch (e) { }
        }

        // Sort by net worth since our proxy (balance) might have outliers
        guildMembers.sort((a, b) => b.netWorth - a.netWorth);

        const medals = ['🥇', '🥈', '🥉'];
        const lines = guildMembers.map((u, i) => {
            const rankLabel = medals[i] || `**${i + 1}.**`;
            const isAuthor = u.userId === message.author.id ? t('leaderboard.you', lang) : '';
            return `${rankLabel} ${u.username} — ${config.EMOJIS.COIN} **${u.netWorth.toLocaleString()}**${isAuthor}`;
        });

        const embed = new EmbedBuilder()
            .setTitle(t('leaderboard.title', lang, { server: message.guild.name }))
            .setDescription(lines.join('\n') || t('leaderboard.empty', lang))
            .setColor(config.COLORS.SUCCESS)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: t('leaderboard.footer', lang) })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
