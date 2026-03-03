const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { CATCHES } = require('../../utils/fishData');

module.exports = {
    name: 'fishinfo',
    aliases: ['fi', 'fishlist'],
    description: 'Xem danh sách tất cả các loại cá và vật phẩm',
    cooldown: 5,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        const ITEMS_PER_PAGE = 8;
        let currentPage = 0;
        if (args[0] && !isNaN(args[0])) {
            currentPage = Math.max(0, parseInt(args[0]) - 1);
        }

        const totalPages = Math.ceil(CATCHES.length / ITEMS_PER_PAGE);
        if (currentPage >= totalPages) currentPage = totalPages - 1;

        const generateInfoEmbed = (page) => {
            const start = page * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentItems = CATCHES.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle(t('fish.info_title', lang))
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 512 }));

            let listText = '';
            for (const item of currentItems) {
                const itemName = t(`fish.items.${item.key}`, lang);
                listText += `${item.emoji} **${itemName}**\n`;
                listText += `└ ${t('fish.info_value', lang, { value: item.value.toLocaleString() })} • ${t('fish.info_luck', lang, { luck: item.minLuck })}\n\n`;
            }

            embed.setDescription(listText);
            embed.setFooter({ text: t('fish.info_footer', lang, { page: page + 1, total: totalPages, prefix: config.PREFIX }) });
            return embed;
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('fishinfo_prev')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('fishinfo_next')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page >= totalPages - 1)
            );
        };

        const infoMsg = await message.reply({
            embeds: [generateInfoEmbed(currentPage)],
            components: [generateButtons(currentPage)]
        });

        const collector = infoMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 60000,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'fishinfo_prev') currentPage--;
            if (i.customId === 'fishinfo_next') currentPage++;

            await i.update({
                embeds: [generateInfoEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            infoMsg.edit({ components: [] }).catch(() => { });
        });
    }
};
