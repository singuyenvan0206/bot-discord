const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'divorce',
    aliases: ['dv'],
    description: 'Ly hôn (Divorce)',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const marriage = db.getMarriage(message.guild.id, message.author.id);

        if (!marriage) {
            return message.reply(t('divorce.not_married', lang));
        }

        const partnerId = marriage.user1_id === message.author.id ? marriage.user2_id : marriage.user1_id;
        const partner = await message.client.users.fetch(partnerId).catch(() => ({ toString: () => 'Nửa kia' }));

        const bonus = marriage.ring_id === 702 ? 50 : 25;

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_divorce')
                .setLabel(t('divorce.confirm_label', lang))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_divorce')
                .setLabel(t('divorce.cancel_label', lang))
                .setStyle(ButtonStyle.Secondary)
        );

        const msg = await message.reply({
            content: t('divorce.confirm_desc', lang, { partner: partner.toString(), percent: bonus }),
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000
        });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return;

            if (i.customId === 'confirm_divorce') {
                db.deleteMarriage(message.guild.id, message.author.id);
                await i.update({
                    content: t('divorce.success', lang, { user: message.author.toString(), partner: partner.toString() }),
                    components: []
                });
            } else {
                await i.update({
                    content: t('divorce.cancelled', lang),
                    components: []
                });
            }
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                msg.edit({ components: [] }).catch(() => { });
            }
        });
    }
};
