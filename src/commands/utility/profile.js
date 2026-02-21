const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { calculateNetWorth } = require('../../utils/economy');

module.exports = {
    name: 'profile',
    aliases: ['p', 'pr', 'prof'],
    description: 'Hiển thị hồ sơ người dùng đầy đủ',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
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
        const rank = rankIndex === -1 ? t('profile.unranked', lang) : `#${rankIndex + 1}`;

        const embed = new EmbedBuilder()
            .setAuthor({ name: t('profile.title', lang, { user: user.tag }), iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setColor(config.COLORS.INFO)
            .addFields(
                { name: t('profile.economy', lang), value: t('profile.balance', lang, { emoji: config.EMOJIS.COIN, amount: dbUser.balance.toLocaleString() }) + '\n' + t('profile.net_worth', lang, { emoji: config.EMOJIS.COIN, amount: netWorth.toLocaleString() }), inline: true },
                { name: t('profile.ranking', lang), value: t('profile.wealth_rank', lang, { rank }), inline: true },
                { name: t('profile.collection', lang), value: t('profile.total_items', lang, { count: itemCount }) + '\n' + t('profile.item_types', lang, { count: Object.keys(inv).length }), inline: true },
                { name: t('profile.joined', lang), value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                { name: t('profile.id', lang), value: `\`${user.id}\``, inline: true }
            )
            .setFooter({ text: t('profile.footer', lang, { prefix: config.PREFIX }) })
            .setTimestamp();

        // Add banner if possible
        const fetchedUser = await user.fetch(true).catch(() => null);
        if (fetchedUser?.bannerURL()) {
            embed.setImage(fetchedUser.bannerURL({ dynamic: true, size: 1024 }));
        }

        return message.reply({ embeds: [embed] });
    }
};
