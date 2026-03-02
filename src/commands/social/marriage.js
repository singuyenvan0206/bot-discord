const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const shopItems = require('../../utils/shopItems');

module.exports = {
    name: 'marriage',
    aliases: ['mr', 'mrg'],
    description: 'Hôn nhân (Marriage info)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const marriage = await db.getMarriage(message.guild.id, message.author.id);

        if (!marriage) {
            return message.reply(t('marriage.no_marriage', lang));
        }

        const partnerId = marriage.user1_id === message.author.id ? marriage.user2_id : marriage.user1_id;
        const partner = await message.client.users.fetch(partnerId).catch(() => null);

        const anniversary = new Date(marriage.created_at * 1000).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const ringName = marriage.ring_id ? t(`items.${marriage.ring_id}.name`, lang) : t('common.none', lang);
        const ring = shopItems.find(i => i.id === marriage.ring_id);
        const bonus = ring ? (ring.multiplier * 100).toLocaleString() : '0';

        const embed = new EmbedBuilder()
            .setTitle(t('marriage.title', lang))
            .setColor(marriage.ring_id === 702 ? 0xE0FBFF : 0xFF69B4)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3656/3656882.png')
            .addFields(
                { name: t('marriage.partner', lang), value: partner ? `${partner.tag} (${partner.toString()})` : 'Unknown', inline: false },
                { name: t('marriage.anniversary', lang), value: `📅 ${anniversary}`, inline: true },
                { name: t('marriage.ring', lang), value: `💍 ${ringName}`, inline: true },
                { name: t('marriage.bonus', lang), value: `📈 +${bonus}% Income`, inline: true }
            )
            .setFooter({ text: t('marriage.footer', lang) })
            .setTimestamp();

        if (partner) {
            embed.setImage(partner.displayAvatarURL({ dynamic: true, size: 1024 }));
        }

        await message.reply({ embeds: [embed] });
    }
};
