const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'marry',
    aliases: ['m'],
    description: 'Kết hôn (Propose to someone)',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first();

        if (!target) {
            return message.reply(t('marry.mention', lang));
        }

        if (target.id === message.author.id) {
            return message.reply(t('marry.self', lang));
        }

        if (target.bot) {
            return message.reply(t('marry.bot', lang));
        }

        // Check if either user is already married (guild-specific)
        const userMarriage = db.getMarriage(message.guild.id, message.author.id);
        if (userMarriage) {
            return message.reply(t('marry.already_married_self', lang));
        }

        const targetMarriage = db.getMarriage(message.guild.id, target.id);
        if (targetMarriage) {
            return message.reply(t('marry.already_married_target', lang));
        }

        const dbUser = db.getUser(message.author.id, message.guild.id);

        // Check for rings (701 = Wedding, 702 = Diamond)
        const inv = JSON.parse(dbUser.inventory || '{}');
        const weddingRingCount = inv['701'] || 0;
        const diamondRingCount = inv['702'] || 0;

        if (weddingRingCount <= 0 && diamondRingCount <= 0) {
            return message.reply(t('buy.no_ring', lang));
        }

        // Use Diamond Ring if available, otherwise use Wedding Ring
        const ringId = diamondRingCount > 0 ? 702 : 701;
        const ring = SHOP_ITEMS.find(i => i.id === ringId);
        const ringName = ring ? ring.name : 'Unknown Ring';

        const embed = new EmbedBuilder()
            .setTitle(t('marry.proposal_title', lang))
            .setDescription(t('marry.proposal_desc', lang, {
                user: message.author.toString(),
                target: target.toString(),
                ring: ringName
            }))
            .setColor(ringId === 702 ? '#E0FBFF' : (config.COLORS.LOVE || '#FF69B4'))
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 1024 }));

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_marry')
                    .setLabel(t('marry.accept_label', lang))
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('deny_marry')
                    .setLabel(t('marry.deny_label', lang))
                    .setStyle(ButtonStyle.Danger)
            );

        const proposal = await message.reply({
            content: `${target.toString()}`,
            embeds: [embed],
            components: [row]
        });

        const collector = proposal.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // 1 minute to answer
        });

        collector.on('collect', async i => {
            if (i.user.id !== target.id) {
                return i.reply({ content: t('marry.not_target', lang), ephemeral: true });
            }

            if (i.customId === 'accept_marry') {
                // Final check before saving
                const finalCheckUser = db.getMarriage(message.guild.id, message.author.id);
                const finalCheckTarget = db.getMarriage(message.guild.id, target.id);

                if (finalCheckUser || finalCheckTarget) {
                    return i.update({ content: t('marry.already_married_self', lang), embeds: [], components: [] });
                }

                // Final inventory check - ensure the proposer still has the ring
                const finalInvCheck = db.getUser(message.author.id, message.guild.id);
                const currentInv = JSON.parse(finalInvCheck.inventory || '{}');
                if (!currentInv[String(ringId)] || currentInv[String(ringId)] <= 0) {
                    return i.update({ content: t('buy.no_ring', lang), embeds: [], components: [] });
                }

                // Remove the used ring
                if (!db.removeItem(message.guild.id, message.author.id, String(ringId), 1)) {
                    return i.update({ content: t('buy.no_ring', lang), embeds: [], components: [] });
                }

                db.createMarriage(message.guild.id, message.author.id, target.id, ringId);

                const acceptMsg = ringId === 702
                    ? t('marry.accepted_diamond', lang, { user: message.author.toString(), target: target.toString() })
                    : t('marry.accepted', lang, { user: message.author.toString(), target: target.toString() });

                await i.update({
                    content: acceptMsg,
                    embeds: [],
                    components: []
                });
            } else {
                await i.update({
                    content: t('marry.denied', lang, { user: message.author.toString(), target: target.toString() }),
                    embeds: [],
                    components: []
                });
            }
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                proposal.edit({
                    content: t('marry.timeout', lang, { target: target.toString() }),
                    embeds: [],
                    components: []
                }).catch(() => { });
            }
        });
    }
};
