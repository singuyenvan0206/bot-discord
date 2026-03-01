const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t } = require('../../utils/i18n');
const config = require('../../config');
const housingConfig = require('../../config/housing');

module.exports = {
    name: 'house',
    description: 'Manage your housing and buffs',
    aliases: ['home', 'nha'],
    async execute(message, args, lang) {
        const sub = args[0] ? args[0].toLowerCase() : 'info';
        const user = await db.getUser(message.author.id);

        if (sub === 'buy') {
            const tierId = args[1] ? args[1].toLowerCase() : null;
            if (!tierId || !housingConfig.TIERS[tierId]) {
                return message.reply(t('housing.buy_usage', lang));
            }

            const tier = housingConfig.TIERS[tierId];

            if (user.balance < tier.price) {
                return message.reply(t('housing.buy_error_funds', lang, { price: tier.price.toLocaleString(), name: tier.name[lang] }));
            }

            // Check if user already has a better or same tier
            const currentTierId = user.house_id;
            const tierList = Object.keys(housingConfig.TIERS);
            const currentIdx = tierList.indexOf(currentTierId);
            const newIdx = tierList.indexOf(tierId);

            if (currentIdx >= newIdx) {
                return message.reply(t('housing.buy_error_already_owned', lang));
            }

            await db.removeBalance(message.author.id, tier.price);
            await db.updateUser(message.author.id, { house_id: tierId });

            return message.reply(t('housing.sell_success', lang, { price: refund.toLocaleString() }));
        }

        if (sub === 'decorate' || sub === 'upgrade') {
            const interiorId = args[1] ? args[1].toLowerCase() : null;
            if (!interiorId || !housingConfig.INTERIORS[interiorId]) {
                const list = Object.entries(housingConfig.INTERIORS).map(([id, data]) => `\`${id}\` (${data.name[lang]}: ${data.price.toLocaleString()} coins)`).join('\n');
                return message.reply(`${t('housing.decorate_usage', lang) || "Usage: $house decorate <id>"}\nAvailable:\n${list}`);
            }

            if (!user.house_id) return message.reply(t('housing.info_none', lang));

            const interior = housingConfig.INTERIORS[interiorId];
            const houseData = JSON.parse(user.house_data || '{}');

            if (houseData[interiorId]) return message.reply(t('housing.decorate_error_owned', lang) || "You already have this decoration!");

            if (user.balance < interior.price) {
                return message.reply(t('housing.buy_error_funds', lang, { price: interior.price.toLocaleString(), name: interior.name[lang] }));
            }

            await db.removeBalance(message.author.id, interior.price);
            houseData[interiorId] = true;
            await db.updateUser(message.author.id, { house_data: JSON.stringify(houseData) });

            return message.reply(t('housing.upgrade_success', lang, { name: interior.name[lang], buff: `+${interior.value} ${interior.buff}` }));
        }

        if (sub === 'info' || !sub) {
            const tierId = user.house_id;

            const embed = new EmbedBuilder()
                .setTitle(t('housing.info_title', lang))
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.author.displayAvatarURL());

            if (!tierId) {
                embed.setDescription(t('housing.info_none', lang));
            } else {
                const tier = housingConfig.TIERS[tierId];
                // Calculate total buffs including interiors if implemented
                // For now just tier buffs
                embed.addFields(
                    { name: t('housing.info_tier', lang, { name: tier.name[lang], icon: tier.icon }), value: ' ' },
                    {
                        name: '✨ Buffs',
                        value: t('housing.info_buffs', lang, {
                            xp: (tier.xp_buff * 100).toFixed(0),
                            income: (tier.income_buff * 100).toFixed(0),
                            max_bet: tier.max_bet_bonus.toLocaleString()
                        })
                    }
                );
            }

            return message.channel.send({ embeds: [embed] });
        }

        // Handle list of available houses if user just types $house
        if (sub === 'list') {
            const embed = new EmbedBuilder()
                .setTitle('🏠 Real Estate Market')
                .setColor(config.COLORS.INFO)
                .setDescription('Use `$house buy <id>` to purchase.');

            Object.values(housingConfig.TIERS).forEach(t => {
                embed.addFields({
                    name: `${t.icon} ${t.name[lang]} (ID: ${t.id})`,
                    value: `💰 **${t.price.toLocaleString()}** coins\nBuffs: +${(t.xp_buff * 100)}% XP, +${(t.income_buff * 100)}% Income\nMax Bet: +${t.max_bet_bonus.toLocaleString()}`
                });
            });

            return message.channel.send({ embeds: [embed] });
        }
    }
};
