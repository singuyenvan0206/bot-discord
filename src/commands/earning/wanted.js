const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');

module.exports = {
    name: 'wanted',
    aliases: ['truyna', 'bounty'],
    description: 'Xem danh sách truy nã (View most wanted list)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        // Fetch top 10 users by bounty
        const topWanted = await db.queryAll('SELECT id, bounty, wanted_level FROM users WHERE bounty > 0 ORDER BY bounty DESC LIMIT 10');

        if (topWanted.length === 0) {
            return message.reply(t('wanted.none', lang));
        }

        const embed = new EmbedBuilder()
            .setTitle(`📜 ${t('wanted.title', lang)}`)
            .setColor(config.COLORS.ERROR)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/742/742751.png')
            .setDescription(t('wanted.description', lang))
            .setTimestamp();

        for (let i = 0; i < topWanted.length; i++) {
            const row = topWanted[i];
            const userRef = await message.client.users.fetch(row.id).catch(() => ({ username: 'Unknown' }));
            const stars = '⭐'.repeat(row.wanted_level || 1);

            embed.addFields({
                name: `${i + 1}. ${userRef.username} ${stars}`,
                value: `${config.EMOJIS.COIN} **${Number(row.bounty).toLocaleString()}**`,
                inline: false
            });
        }

        embed.setFooter({ text: t('wanted.footer', lang) });

        return message.reply({ embeds: [embed] });
    }
};
