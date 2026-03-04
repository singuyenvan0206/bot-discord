const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { RODS, BAITS, getWeightedPool } = require('../../utils/fishData');

module.exports = {
    name: 'fishrates',
    aliases: ['frates', 'fr'],
    description: 'Xem tỉ lệ câu cá theo trang bị hiện tại (View fishing rates based on current gear)',
    cooldown: 5,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild?.id);
        const inventory = JSON.parse(user.inventory || '{}');

        // Find best rod
        let rod = null;
        for (const r of RODS) {
            if (inventory[r.id]) { rod = r; break; }
        }

        // Find best bait
        let bait = null;
        for (const b of BAITS) {
            if (inventory[b.id] && inventory[b.id] > 0) { bait = b; break; }
        }

        // Calculate luck (rod defaults to Bamboo 1.0 if none found)
        const effectiveRod = rod || { id: '408', luck: 1.0 };
        const effectiveBait = bait || { id: '401', luck: 0.1 };

        const rodName = t(`items.${effectiveRod.id}.name`, lang);
        const baitName = t(`items.${effectiveBait.id}.name`, lang);

        let totalLuck = effectiveRod.luck + effectiveBait.luck;
        if (user.job === 'farmer') totalLuck *= 1.2;

        const weightedPool = getWeightedPool(totalLuck);
        const totalWeight = weightedPool.reduce((acc, c) => acc + c.weight, 0);

        // Sort by value descending (rarest first)
        const sortedPool = [...weightedPool].sort((a, b) => b.value - a.value);

        // Pagination setup
        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(sortedPool.length / ITEMS_PER_PAGE);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentItems = sortedPool.slice(start, end);

            let ratesText = '';
            for (const item of currentItems) {
                const chance = ((item.weight / totalWeight) * 100).toFixed(2);
                const itemName = t(`fish.items.${item.key}`, lang);
                ratesText += `${item.emoji} **${itemName}**: \`${chance}%\`\n`;
            }

            return new EmbedBuilder()
                .setTitle(t('fish.rates_title', lang))
                .setColor(config.COLORS.INFO)
                .setDescription(t('fish.rates_desc', lang, { rod: rodName, bait: baitName, luck: totalLuck.toFixed(2) }))
                .addFields({ name: `${t('common.choices', lang)} (${page + 1}/${totalPages})`, value: ratesText || '-' })
                .setFooter({ text: t('fish.rates_footer', lang, { prefix: config.PREFIX }) })
                .setTimestamp();
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('frates_prev')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('frates_next')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1)
            );
        };

        const reply = await message.reply({
            embeds: [generateEmbed(currentPage)],
            components: totalPages > 1 ? [generateButtons(currentPage)] : []
        });

        if (totalPages <= 1) return;

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async i => {
            if (i.customId === 'frates_prev') currentPage--;
            if (i.customId === 'frates_next') currentPage++;

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => { });
        });
    }
};
