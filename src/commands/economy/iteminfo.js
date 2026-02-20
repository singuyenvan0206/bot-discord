const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'iteminfo',
    aliases: ['item', 'info', 'ii'],
    description: 'Xem thông tin chi tiết của một vật phẩm',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const query = args.join(' ').toLowerCase();

        if (!query) {
            return message.reply(t('iteminfo.prompt', lang, { prefix: config.PREFIX }));
        }

        // Try to find by numerical ID, then by partial name (internal name)
        const item = SHOP_ITEMS.find(i =>
            String(i.id) === query ||
            i.name.toLowerCase().includes(query)
        );

        if (!item) {
            return message.reply(t('iteminfo.not_found', lang, { prefix: config.PREFIX }));
        }

        // Get localized strings
        const name = t(`items.${item.id}.name`, lang);
        const desc = t(`items.${item.id}.desc`, lang);

        // Detailed description logic with fallback
        let details = t(`items.${item.id}.details`, lang);
        if (details.startsWith('items.')) {
            details = t('iteminfo.no_details', lang);
        }

        const categoryName = t(`inventory.categories.${item.type}`, lang) || item.type;
        const sellPrice = Math.floor(item.price * config.ECONOMY.SELL_RECOVERY);

        // Check inventory
        const userData = db.getUser(message.author.id);
        const inv = JSON.parse(userData.inventory || '{}');
        const count = inv[item.id] || 0;

        const embed = new EmbedBuilder()
            .setTitle(t('iteminfo.title', lang, { name }))
            .setDescription(`*${desc}*`)
            .setColor(config.COLORS.INFO)
            .addFields(
                { name: t('iteminfo.details_label', lang), value: details, inline: false },
                { name: `💰 ${t('iteminfo.price_label', lang)}`, value: item.price.toLocaleString(), inline: true },
                { name: `💸 ${t('iteminfo.sell_label', lang)}`, value: sellPrice.toLocaleString(), inline: true },
                { name: `📁 ${t('iteminfo.category_label', lang)}`, value: categoryName, inline: true }
            );

        if (item.multiplier) {
            embed.addFields({ name: `✨ ${t('iteminfo.effect_label', lang)}`, value: `+${Math.round(item.multiplier * 100)}%`, inline: true });
        }

        embed.addFields({ name: `🎒 ${t('iteminfo.owned_label', lang)}`, value: `${count.toLocaleString()}`, inline: true });

        // Add image placeholder if later decided (could use emoji ID as well)
        // embed.setThumbnail(someUrl)

        return message.reply({ embeds: [embed] });
    }
};
