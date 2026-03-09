const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');

module.exports = {
    name: 'wanted',
    aliases: ['truyna', 'wnt', 'wantedlist', 'bountyboard', 'ds-truyna'],
    description: 'Xem danh sách truy nã hoặc lệnh truy nã cá nhân (Most wanted list or individual poster)',
    usage: '[@user]',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        // CASE: Individual Wanted Poster
        let target = message.mentions.users.first();
        if (!target && args[0]) {
            target = await message.client.users.fetch(args[0]).catch(() => null);
        }

        if (target) {
            const userData = await db.getUser(target.id, message.guild.id);
            const bounty = Number(userData.bounty || 0);
            const stars = Number(userData.wanted_level || 0);
            const expiresAt = Number(userData.wanted_expires_at || 0);

            if (bounty <= 0 && stars <= 0) {
                return message.reply(t('wanted.not_found', lang, { user: target.username }));
            }

            const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 512 });
            const wantedUrl = `https://some-random-api.com/canvas/overlay/wanted?avatar=${encodeURIComponent(avatarUrl)}`;

            const starString = '⭐'.repeat(stars || 1);
            const timeString = expiresAt > 0 ? `<t:${expiresAt}:R>` : t('common.permanent', lang);

            const embed = new EmbedBuilder()
                .setTitle(t('wanted.poster_title', lang, { user: target.username }))
                .setDescription(t('wanted.poster_desc', lang, {
                    bounty: bounty.toLocaleString(),
                    emoji: config.EMOJIS.COIN,
                    stars: starString,
                    expires: timeString
                }))
                .setImage(wantedUrl)
                .setColor(config.COLORS.ERROR)
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // CASE: Bounty Board (Top 10)
        const topWanted = await db.queryAll('SELECT id, bounty, wanted_level FROM users WHERE bounty > 0 ORDER BY bounty DESC LIMIT 10');

        if (topWanted.length === 0) {
            return message.reply(t('wanted.board_none', lang));
        }

        const boardEmbed = new EmbedBuilder()
            .setTitle(`📜 ${t('wanted.board_title', lang)}`)
            .setColor(config.COLORS.ERROR)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/742/742751.png')
            .setDescription(t('wanted.board_desc', lang))
            .setTimestamp();

        for (let i = 0; i < topWanted.length; i++) {
            const row = topWanted[i];
            const userRef = await message.client.users.fetch(row.id).catch(() => ({ username: 'Unknown' }));
            const stars = '⭐'.repeat(row.wanted_level || 1);

            boardEmbed.addFields({
                name: `${i + 1}. ${userRef.username} ${stars}`,
                value: `${config.EMOJIS.COIN} **${Number(row.bounty).toLocaleString()}**`,
                inline: false
            });
        }

        boardEmbed.setFooter({ text: t('wanted.board_footer', lang) });

        return message.reply({ embeds: [boardEmbed] });
    }
};
