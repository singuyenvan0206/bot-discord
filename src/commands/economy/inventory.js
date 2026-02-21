const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'i', 'bag'],
    description: 'Xem túi đồ của bạn',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const userData = db.getUser(message.author.id);
        const inv = JSON.parse(userData.inventory || '{}');

        const title = t('inventory.title', lang, { user: message.author.username });

        if (Object.keys(inv).length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setAuthor({ name: title, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription(t('inventory.empty', lang, { prefix: config.PREFIX }))
                .setColor(config.COLORS.INFO);
            return message.reply({ embeds: [emptyEmbed] });
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: title, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setColor(config.COLORS.INFO)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp();

        // Categorize items and calculate stats
        const categories = {
            'tool': { name: t('inventory.categories.tool', lang), items: [] },
            'bait': { name: t('inventory.categories.bait', lang), items: [] },
            'income': { name: t('inventory.categories.income', lang), items: [] },
            'daily': { name: t('inventory.categories.daily', lang), items: [] },
            'gamble': { name: t('inventory.categories.gamble', lang), items: [] },
            'other': { name: t('inventory.categories.other', lang), items: [] }
        };

        let totalItems = 0;
        let totalValue = 0;

        for (const [id, count] of Object.entries(inv)) {
            totalItems += count;
            const item = SHOP_ITEMS.find(i => String(i.id) === id);
            if (item) {
                totalValue += (item.price * count);
                const cat = categories[item.type] || categories['other'];
                const itemName = t(`items.${item.id}.name`, lang);
                cat.items.push(`**${itemName}** x${count}`);
            } else {
                categories['other'].items.push(`**ID: ${id}** x${count}`);
            }
        }

        // Add Summary Summary Field
        embed.addFields({
            name: t('inventory.info', lang),
            value: `${t('inventory.total_items', lang, { count: totalItems.toLocaleString() })}\n${t('inventory.inventory_value', lang, { emoji: config.EMOJIS.COIN, amount: totalValue.toLocaleString() })}`,
            inline: false
        });

        // Add Category Fields
        for (const [key, cat] of Object.entries(categories)) {
            if (cat.items.length > 0) {
                embed.addFields({
                    name: cat.name,
                    value: cat.items.join('\n'),
                    inline: true
                });
            }
        }

        embed.setFooter({ text: t('inventory.sell_tip', lang, { prefix: config.PREFIX }) });

        return message.reply({ embeds: [embed] });
    }
};
