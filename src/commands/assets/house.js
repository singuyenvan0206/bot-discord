const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const housingConfig = require('../../config/housing');

module.exports = {
    name: 'house',
    description: 'Manage your housing and buffs',
    aliases: ['home', 'nha'],
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const sub = args[0] ? args[0].toLowerCase() : 'info';
        const user = await db.getUser(message.author.id);

        if (sub === 'buy') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (!inputId) {
                return message.reply(t('housing.buy_usage', lang));
            }

            const tier = Object.values(housingConfig.TIERS).find(t =>
                t.id.toLowerCase() === inputId ||
                t.numeric_id.toString() === inputId
            );

            if (!tier) {
                return message.reply('❌ Housing ID not found!');
            }

            const tierId = tier.id;

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
            const { addHouseProfit } = require('../../utils/economy');
            await addHouseProfit(message, tier.price);
            await db.updateUser(message.author.id, { house_id: tierId });

            return message.reply(t('housing.buy_success', lang, {
                name: tier.name[lang],
                price: tier.price.toLocaleString(),
                icon: tier.icon
            }));
        }

        if (sub === 'decorate' || sub === 'upgrade') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (!inputId || inputId === 'list') {
                const embed = new EmbedBuilder()
                    .setTitle(t('housing.upgrade_title', lang))
                    .setColor(config.COLORS.INFO)
                    .setDescription(t('housing.decorate_usage', lang));

                Object.values(housingConfig.INTERIORS).forEach(data => {
                    let buffDesc = '';
                    if (data.buff === 'xp') buffDesc = `+${(data.value * 100).toLocaleString()}% XP`;
                    else if (data.buff === 'income') buffDesc = `+${(data.value * 100).toLocaleString()}% Income`;
                    else if (data.buff === 'max_bet') buffDesc = `+${data.value.toLocaleString()} Max Bet`;
                    else if (data.buff === 'cap') buffDesc = `+${(data.value * 100).toLocaleString()}% Bonus Cap`;

                    embed.addFields({
                        name: `${data.name[lang]} (ID: \`${data.numeric_id}\`)`,
                        value: `💰 **${data.price.toLocaleString()}** coins\n✨ Buff: ${buffDesc}`,
                        inline: true
                    });
                });

                return message.channel.send({ embeds: [embed] });
            }

            if (!user.house_id) return message.reply(t('housing.info_none', lang));

            const houseData = JSON.parse(user.house_data || '{}');

            if (inputId === 'all') {
                let totalCost = 0;
                let itemsAdded = 0;
                const newHouseData = { ...houseData };

                for (const [id, data] of Object.entries(housingConfig.INTERIORS)) {
                    if (!houseData[id]) {
                        totalCost += data.price;
                        itemsAdded++;
                        newHouseData[id] = true;
                    }
                }

                if (itemsAdded === 0) {
                    return message.reply(t('housing.decorate_all_owned', lang) || "❌ Bạn đã sở hữu tất cả nội thất rồi!");
                }

                if (user.balance < totalCost) {
                    return message.reply(t('housing.decorate_all_funds', lang, { price: totalCost.toLocaleString() }) || `❌ Bạn cần **${totalCost.toLocaleString()}** coins để mua tất cả nội thất còn lại!`);
                }

                await db.removeBalance(message.author.id, totalCost);
                const { addHouseProfit } = require('../../utils/economy');
                await addHouseProfit(message, totalCost);
                await db.updateUser(message.author.id, { house_data: JSON.stringify(newHouseData) });

                return message.reply(t('housing.decorate_all_success', lang, { price: totalCost.toLocaleString() }) || `✅ Bạn đã mua toàn bộ nội thất còn thiếu với giá **${totalCost.toLocaleString()}** coins!`);
            }

            const interiorEntry = Object.entries(housingConfig.INTERIORS).find(([id, data]) =>
                id.toLowerCase() === inputId ||
                data.numeric_id.toString() === inputId
            );

            if (!interiorEntry) {
                return message.reply('❌ Decoration ID not found!');
            }

            const [interiorId, interior] = interiorEntry;

            if (houseData[interiorId]) return message.reply(t('housing.decorate_error_owned', lang) || "You already have this decoration!");

            if (user.balance < interior.price) {
                return message.reply(t('housing.buy_error_funds', lang, { price: interior.price.toLocaleString(), name: interior.name[lang] }));
            }

            await db.removeBalance(message.author.id, interior.price);
            const { addHouseProfit } = require('../../utils/economy');
            await addHouseProfit(message, interior.price);
            houseData[interiorId] = true;
            await db.updateUser(message.author.id, { house_data: JSON.stringify(houseData) });

            return message.reply(t('housing.upgrade_success', lang, { name: interior.name[lang], buff: `+${interior.value.toLocaleString()} ${interior.buff}` }));
        }

        if (sub === 'sell') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (inputId !== 'all') {
                return message.reply(t('housing.sell_usage', lang) || "❌ Cách dùng: `$house sell all` để bán tất cả tài sản nhà đất.");
            }

            if (!user.house_id) {
                return message.reply(t('housing.sell_error_none', lang) || "❌ Bạn không có tài sản nào để bán!");
            }

            const tierId = user.house_id;
            const tier = housingConfig.TIERS[tierId];
            let totalValue = tier.price;

            const houseData = JSON.parse(user.house_data || '{}');
            for (const [id, data] of Object.entries(housingConfig.INTERIORS)) {
                if (houseData[id]) {
                    totalValue += data.price;
                }
            }

            const refund = Math.floor(totalValue * 0.5);

            await db.addBalance(message.author.id, refund);
            await db.updateUser(message.author.id, { house_id: null, house_data: '{}' });

            return message.reply(t('housing.sell_all_success', lang, { price: refund.toLocaleString() }) || `💰 Bạn đã bán nhà và tất cả nội thất. Nhận lại **${refund.toLocaleString()}** coins (50% giá trị).`);
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
                const houseData = JSON.parse(user.house_data || '{}');
                // Calculate total buffs (Tier + Decorations)
                let totalXp = tier.xp_buff;
                let totalIncome = tier.income_buff;
                let totalMaxBet = tier.max_bet_bonus;
                let totalCap = tier.cap_bonus || 0;

                const interiors = Object.entries(housingConfig.INTERIORS)
                    .filter(([id]) => houseData[id])
                    .map(([_, data]) => {
                        if (data.buff === 'xp') totalXp += data.value;
                        else if (data.buff === 'income') totalIncome += data.value;
                        else if (data.buff === 'max_bet') totalMaxBet += data.value;
                        else if (data.buff === 'cap') totalCap += data.value;
                        return data.name[lang];
                    })
                    .join(', ') || 'None';

                embed.addFields(
                    { name: `${tier.icon} ${tier.name[lang]} (ID: \`${tier.numeric_id}\`)`, value: ' ' },
                    {
                        name: '✨ Buffs',
                        value: t('housing.info_buffs', lang, {
                            xp: Math.round(totalXp * 100).toLocaleString(),
                            income: Math.round(totalIncome * 100).toLocaleString(),
                            max_bet: totalMaxBet.toLocaleString(),
                            cap: Math.round(totalCap * 100).toLocaleString()
                        })
                    },
                    { name: '🛋️ Decorations', value: interiors }
                );
            }

            return message.channel.send({ embeds: [embed] });
        }

        if (sub === 'list') {
            const embed = new EmbedBuilder()
                .setTitle('🏠 Real Estate Market')
                .setColor(config.COLORS.INFO)
                .setDescription('Use `$house buy <id>` to purchase.');

            Object.values(housingConfig.TIERS).forEach(t => {
                embed.addFields({
                    name: `${t.icon} ${t.name[lang]} (ID: \`${t.numeric_id.toLocaleString()}\`)`,
                    value: `💰 **${t.price.toLocaleString()}** coins\nBuffs: +${(t.xp_buff * 100).toLocaleString()}% XP, +${(t.income_buff * 100).toLocaleString()}% Income\nMax Bet: +${t.max_bet_bonus.toLocaleString()}`
                });
            });

            return message.channel.send({ embeds: [embed] });
        }
    }
};
