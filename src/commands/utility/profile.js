const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { calculateNetWorth } = require('../../utils/economy');

module.exports = {
    name: 'profile',
    aliases: ['p', 'prof'],
    description: 'Xem hồ sơ cá nhân toàn diện của bạn',
    async execute(message, args) {
        const user = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null)
            || message.author;

        const dbUser = db.getUser(user.id);
        const inv = JSON.parse(dbUser.inventory || '{}');
        const itemCount = Object.values(inv).reduce((a, b) => a + b, 0);

        // Calculate Net Worth using utility
        const netWorth = calculateNetWorth(dbUser);

        // Find Rank (Position in global balance top 100)
        const topBalance = db.getTopUsers(100, 'balance');
        const rankIndex = topBalance.findIndex(u => u.id === user.id);
        const rank = rankIndex === -1 ? 'Chưa xếp hạng (>100)' : `#${rankIndex + 1}`;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Hồ sơ của ${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setColor(config.COLORS.INFO)
            .addFields(
                { name: '💰 Kinh tế', value: `**Số dư:** ${config.EMOJIS.COIN} ${dbUser.balance.toLocaleString()}\n**Tổng tài sản:** ${config.EMOJIS.COIN} ${netWorth.toLocaleString()}`, inline: true },
                { name: '🏆 Xếp hạng', value: `**Hạng giàu có:** ${rank}`, inline: true },
                { name: '🎒 Bộ sưu tập', value: `**Tổng vật phẩm:** ${itemCount}\n**Số loại vật phẩm:** ${Object.keys(inv).length}`, inline: true },
                { name: '📅 Tham gia từ', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                { name: '🆔 Định danh (ID)', value: `\`${user.id}\``, inline: true }
            )
            .setFooter({ text: `Nhập ${config.PREFIX}inventory để xem chi tiết vật phẩm` })
            .setTimestamp();

        // Add banner if possible
        const fetchedUser = await user.fetch(true).catch(() => null);
        if (fetchedUser?.bannerURL()) {
            embed.setImage(fetchedUser.bannerURL({ dynamic: true, size: 1024 }));
        }

        return message.reply({ embeds: [embed] });
    }
};
