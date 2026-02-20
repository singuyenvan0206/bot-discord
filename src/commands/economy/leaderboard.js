const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { calculateNetWorth } = require('../../utils/economy');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'Hiển thị 10 người giàu nhất trên máy chủ này',
    async execute(message, args) {
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
            const isAuthor = u.userId === message.author.id ? ' ⬅️ **Bạn**' : '';
            return `${rankLabel} ${u.username} — ${config.EMOJIS.COIN} **${u.netWorth.toLocaleString()}**${isAuthor}`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`🏆  Bảng Xếp Hạng Đại Gia: ${message.guild.name}`)
            .setDescription(lines.join('\n') || '*Chưa có dữ liệu cho máy chủ này.*')
            .setColor(config.COLORS.SUCCESS)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Tổng Tài Sản (Ví + Túi đồ)' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
