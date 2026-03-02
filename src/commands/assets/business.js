const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const bizConfig = require('../../config/businesses');

module.exports = {
    name: 'business',
    description: 'Manage your business empire',
    aliases: ['biz', 'kinhdoanh'],
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const sub = args[0] ? args[0].toLowerCase() : 'info';

        if (sub === 'buy') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (!inputId) {
                const list = Object.values(bizConfig.TYPES).map(b => `\`${b.numeric_id}\` (${b.name[lang]}: ${b.base_price.toLocaleString()} coins)`).join('\n');
                return message.reply(`${t('business.buy_usage', lang)}\nAvailable:\n${list}`);
            }

            if (inputId === 'all') {
                const userBizs = await db.getUserBusinesses(message.author.id);
                const user = await db.getUser(message.author.id);
                let totalCost = 0;
                let bizAdded = 0;

                for (const [id, type] of Object.entries(bizConfig.TYPES)) {
                    if (!userBizs.some(b => b.business_id === id)) {
                        totalCost += type.base_price;
                        bizAdded++;
                    }
                }

                if (bizAdded === 0) return message.reply(t('business.buy_all_owned', lang) || "❌ Bạn đã sở hữu tất cả doanh nghiệp rồi!");

                if (user.balance < totalCost) {
                    return message.reply(t('business.buy_all_funds', lang, { price: totalCost.toLocaleString() }) || `❌ Bạn cần **${totalCost.toLocaleString()}** coins để mua tất cả doanh nghiệp còn lại!`);
                }

                await db.removeBalance(message.author.id, totalCost);
                for (const [id, type] of Object.entries(bizConfig.TYPES)) {
                    if (!userBizs.some(b => b.business_id === id)) {
                        await db.addUserBusiness(message.author.id, id);
                    }
                }

                return message.reply(t('business.buy_all_success', lang, { price: totalCost.toLocaleString() }) || `✅ Bạn đã mua toàn bộ doanh nghiệp còn thiếu với giá **${totalCost.toLocaleString()}** coins!`);
            }

            // Resolve ID (string or numeric)
            const type = Object.values(bizConfig.TYPES).find(b =>
                b.id.toLowerCase() === inputId ||
                b.numeric_id.toString() === inputId
            );

            if (!type) {
                return message.reply('❌ Business ID not found!');
            }

            const typeId = type.id;
            const user = await db.getUser(message.author.id);
            const userBizs = await db.getUserBusinesses(message.author.id);

            if (userBizs.some(b => b.business_id === typeId)) {
                return message.reply(t('business.buy_error_owned', lang));
            }

            if (user.balance < type.base_price) {
                return message.reply(t('business.buy_error_funds', lang, { price: type.base_price.toLocaleString(), name: type.name[lang] }));
            }

            await db.removeBalance(message.author.id, type.base_price);
            await db.addUserBusiness(message.author.id, typeId);

            return message.reply(t('business.buy_success', lang, { name: type.name[lang], income: type.base_income.toLocaleString() }));
        }

        if (sub === 'sell') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (!inputId) return message.reply(t('business.sell_usage', lang));

            if (inputId === 'all') {
                const userBizs = await db.getUserBusinesses(message.author.id);
                if (userBizs.length === 0) return message.reply(t('business.sell_error_none', lang));

                let totalValue = 0;
                for (const b of userBizs) {
                    const type = bizConfig.TYPES[b.business_id];
                    if (type) totalValue += type.base_price;
                }

                const refund = Math.floor(totalValue * 0.5);
                await db.removeAllUserBusinesses(message.author.id);
                await db.addBalance(message.author.id, refund);

                return message.reply(t('business.sell_all_success', lang, { price: refund.toLocaleString() }));
            }

            // P2P Selling
            const targetUser = message.mentions.users.first();
            const price = args[3] ? parseInt(args[3]) : null;

            if (!targetUser || isNaN(price) || price < 0) {
                return message.reply(t('business.sell_p2p_usage', lang));
            }

            if (targetUser.id === message.author.id) {
                return message.reply(t('business.sell_p2p_not_self', lang));
            }

            const type = Object.values(bizConfig.TYPES).find(b =>
                b.id.toLowerCase() === inputId ||
                b.numeric_id.toString() === inputId
            );

            if (!type) return message.reply('❌ Business ID not found!');

            const userBizs = await db.getUserBusinesses(message.author.id);
            const bizToSell = userBizs.find(b => b.business_id === type.id);
            if (!bizToSell) return message.reply(t('business.sell_error_none', lang));

            // Check if buyer already owns it
            const buyerBizs = await db.getUserBusinesses(targetUser.id);
            if (buyerBizs.some(b => b.business_id === type.id)) {
                return message.reply(t('business.sell_p2p_already_owned', lang, { buyer: targetUser.username }));
            }

            const confirmEmbed = new EmbedBuilder()
                .setTitle(t('business.sell_p2p_confirm_title', lang))
                .setDescription(t('business.sell_p2p_confirm_desc', lang, {
                    seller: message.author.username,
                    bizName: type.name[lang],
                    price: price.toLocaleString()
                }))
                .setColor(config.COLORS.INFO)
                .setFooter({ text: t('common.timeout', lang) });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('accept_biz_sale').setLabel(t('connect4.accept', lang)).setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('reject_biz_sale').setLabel(t('connect4.deny', lang)).setStyle(ButtonStyle.Danger)
            );

            const reply = await message.reply({ content: `<@${targetUser.id}>`, embeds: [confirmEmbed], components: [row] });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === targetUser.id,
                time: 60000,
                max: 1
            });

            collector.on('collect', async i => {
                if (i.customId === 'reject_biz_sale') {
                    return i.update({ content: t('business.sell_p2p_rejected', lang, { buyer: targetUser.username, bizName: type.name[lang] }), embeds: [], components: [] });
                }

                // Verify buyer still has the money
                const buyer = await db.getUser(targetUser.id);
                if (buyer.balance < price) {
                    return i.update({ content: t('business.sell_p2p_no_funds', lang, { buyer: targetUser.username }), embeds: [], components: [] });
                }

                // Double check seller still has the biz
                const sellerBizs = await db.getUserBusinesses(message.author.id);
                if (!sellerBizs.some(b => b.business_id === type.id)) {
                    return i.update({ content: "❌ Giao dịch thất bại: Người bán không còn sở hữu doanh nghiệp này.", embeds: [], components: [] });
                }

                // Perform transfer
                await db.removeBalance(targetUser.id, price);
                await db.addBalance(message.author.id, price);
                await db.transferUserBusiness(message.author.id, targetUser.id, type.id);

                return i.update({
                    content: t('business.sell_p2p_success', lang, {
                        buyer: targetUser.username,
                        seller: message.author.username,
                        bizName: type.name[lang],
                        price: price.toLocaleString()
                    }),
                    embeds: [],
                    components: []
                });
            });

            collector.on('end', (_, reason) => {
                if (reason === 'time') {
                    reply.edit({ content: t('business.sell_p2p_timeout', lang), embeds: [], components: [] }).catch(() => { });
                }
            });
        }

        if (sub === 'info' || !sub) {
            const userBizs = await db.getUserBusinesses(message.author.id);

            const embed = new EmbedBuilder()
                .setTitle(t('business.info_title', lang, { user: message.author.username }))
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.author.displayAvatarURL());

            if (userBizs.length === 0) {
                embed.setDescription(t('business.info_none', lang));
            } else {
                let totalIncome = 0;
                userBizs.forEach(b => {
                    const type = bizConfig.TYPES[b.business_id];
                    const hourly = bizConfig.calculateBusinessIncome(b.business_id, b.level);
                    const now = Math.floor(Date.now() / 1000);
                    const isBuffed = (b.manager_expires_at || 0) > now;
                    let managerStatus = '🔴 Đang nghỉ ngơi';
                    if (isBuffed) {
                        const leftSeconds = b.manager_expires_at - now;
                        const h = Math.floor(leftSeconds / 3600);
                        const m = Math.floor((leftSeconds % 3600) / 60);
                        managerStatus = `🟢 Đang quản lý (còn ${h}h ${m}m)`;
                    }

                    totalIncome += isBuffed ? Math.floor(hourly * bizConfig.MANAGER_INCOME_MULTIPLIER) : hourly;

                    const isMax = b.level >= type.max_level;
                    const upgradeCost = isMax
                        ? (lang === 'vi' ? 'Tối đa' : 'Max')
                        : Math.floor(type.base_price * Math.pow(bizConfig.UPGRADE_COST_MULTIPLIER, b.level)).toLocaleString();

                    embed.addFields({
                        name: `${type.icon} ${type.name[lang]} (ID: \`${type.numeric_id}\`)`,
                        value: t('business.info_item', lang, {
                            icon: type.icon,
                            name: type.name[lang],
                            level: b.level,
                            income: (isBuffed ? Math.floor(hourly * bizConfig.MANAGER_INCOME_MULTIPLIER) : hourly).toLocaleString(),
                            staff: managerStatus,
                            upgrade_cost: upgradeCost,
                            staff_cost: `${bizConfig.MANAGER_HOURLY_COST.toLocaleString()}/h`
                        })
                    });
                });
                embed.setDescription(t('business.passive_income', lang, { amount: totalIncome.toLocaleString() }));
                embed.setFooter({ text: t('business.info_footer', lang) });
            }

            return message.channel.send({ embeds: [embed] });
        }

        if (sub === 'collect' || sub === 'harvest' || sub === 'thuhoach') {
            const userBizs = await db.getUserBusinesses(message.author.id);
            if (userBizs.length === 0) return message.reply(t('business.info_none', lang));

            let totalReward = 0;
            const now = Math.floor(Date.now() / 1000);

            for (const b of userBizs) {
                const now = Math.floor(Date.now() / 1000);
                const secondsPassed = now - b.last_harvest;
                const hoursPassed = secondsPassed / 3600;

                if (hoursPassed >= 1) {
                    const buffEnd = Math.min(now, b.manager_expires_at || 0);
                    const buffSeconds = Math.max(0, buffEnd - b.last_harvest);
                    const normalSeconds = secondsPassed - buffSeconds;

                    const hourly = bizConfig.calculateBusinessIncome(b.business_id, b.level);
                    const amount = Math.floor((buffSeconds / 3600) * (hourly * bizConfig.MANAGER_INCOME_MULTIPLIER) + (normalSeconds / 3600) * hourly);

                    totalReward += amount;
                    await db.updateUserBusiness(message.author.id, b.business_id, { last_harvest: now });
                }
            }

            if (totalReward <= 0) {
                return message.reply('⏳ Its too early to collect! Wait at least 1 hour.');
            }

            await db.addBalance(message.author.id, totalReward);
            return message.reply(t('business.harvest_success', lang, { amount: totalReward.toLocaleString() }));
        }

        if (sub === 'upgrade') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (!inputId) return message.reply(t('business.upgrade_usage', lang) || '❌ Cách dùng: `$business upgrade <id|all> [số_cấp]`');

            const userBizs = await db.getUserBusinesses(message.author.id);
            if (userBizs.length === 0) return message.reply(t('business.sell_error_none', lang) || '❌ You don\'t own any businesses!');

            const user = await db.getUser(message.author.id);
            const requestedLevels = args[2] ? Math.max(1, parseInt(args[2]) || 1) : 1;

            if (inputId === 'all') {
                let totalCost = 0;
                let eligibleCount = 0;
                const businessesToUpgrade = [];

                for (const b of userBizs) {
                    const type = bizConfig.TYPES[b.business_id];
                    if (type && b.level < type.max_level) {
                        const upgradeable = Math.min(requestedLevels, type.max_level - b.level);
                        if (upgradeable > 0) {
                            let itemCost = 0;
                            for (let i = 0; i < upgradeable; i++) {
                                itemCost += Math.floor(type.base_price * Math.pow(bizConfig.UPGRADE_COST_MULTIPLIER, b.level + i));
                            }
                            totalCost += itemCost;
                            eligibleCount++;
                            businessesToUpgrade.push({ id: b.business_id, newLevel: b.level + upgradeable });
                        }
                    }
                }

                if (eligibleCount === 0) {
                    return message.reply(t('business.upgrade_all_max', lang) || "❌ Tất cả doanh nghiệp của bạn đã đạt cấp tối đa!");
                }

                if (user.balance < totalCost) {
                    return message.reply(t('business.upgrade_all_funds', lang, { price: totalCost.toLocaleString() }) || `❌ Bạn cần **${totalCost.toLocaleString()}** coins để nâng cấp đồng loạt tất cả doanh nghiệp!`);
                }

                await db.removeBalance(message.author.id, totalCost);
                for (const b of businessesToUpgrade) {
                    await db.updateUserBusiness(message.author.id, b.id, { level: b.newLevel });
                }

                return message.reply(t('business.upgrade_all_success', lang, { count: eligibleCount, price: totalCost.toLocaleString() }) || `✅ Bạn đã nâng cấp thành công ${eligibleCount} doanh nghiệp với tổng chi phí **${totalCost.toLocaleString()}** coins!`);
            }

            const biz = userBizs.find(b => {
                const type = bizConfig.TYPES[b.business_id];
                return type.id.toLowerCase() === inputId || type.numeric_id.toString() === inputId;
            });

            if (!biz) return message.reply('❌ You dont own this business or invaild ID!');

            const bizId = biz.business_id;
            const type = bizConfig.TYPES[bizId];
            if (biz.level >= type.max_level) return message.reply('❌ This business is already at maximum level!');

            const upgradeable = Math.min(requestedLevels, type.max_level - biz.level);
            let upgradeCost = 0;
            for (let i = 0; i < upgradeable; i++) {
                upgradeCost += Math.floor(type.base_price * Math.pow(bizConfig.UPGRADE_COST_MULTIPLIER, biz.level + i));
            }

            if (user.balance < upgradeCost) {
                return message.reply(`❌ You need **${upgradeCost.toLocaleString()}** coins for this upgrade!`);
            }

            await db.removeBalance(message.author.id, upgradeCost);
            await db.updateUserBusiness(message.author.id, bizId, { level: biz.level + upgradeable });

            return message.reply(t('business.upgrade_success', lang, { level: biz.level + upgradeable, added: upgradeable }));
        }

        if (sub === 'hire') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (!inputId) return message.reply(t('business.hire_usage', lang) || '❌ Please specify the business ID to hire a manager!');

            const userBizs = await db.getUserBusinesses(message.author.id);
            if (userBizs.length === 0) return message.reply(t('business.sell_error_none', lang) || '❌ You don\'t own any businesses!');

            const user = await db.getUser(message.author.id);
            const costPerHour = bizConfig.MANAGER_HOURLY_COST;
            const now = Math.floor(Date.now() / 1000);

            if (inputId === 'all') {
                const hours = args[2] ? Math.max(1, parseInt(args[2]) || 1) : 1;
                const totalCost = userBizs.length * costPerHour * hours;

                if (user.balance < totalCost) {
                    return message.reply(t('business.hire_all_funds', lang, { price: totalCost.toLocaleString() }) || `❌ Bạn cần **${totalCost.toLocaleString()}** coins để thuê quản lý cho tất cả doanh nghiệp!`);
                }

                await db.removeBalance(message.author.id, totalCost);
                for (const b of userBizs) {
                    const currentExpires = b.manager_expires_at || 0;
                    const newExpiresAt = Math.max(now, currentExpires) + (hours * 3600);
                    await db.updateUserBusiness(message.author.id, b.business_id, { manager_expires_at: newExpiresAt });
                }

                return message.reply(t('business.hire_all_success', lang, { price: totalCost.toLocaleString(), hours: hours }) || `✅ Bạn đã thuê quản lý ${hours} giờ cho toàn bộ doanh nghiệp với giá **${totalCost.toLocaleString()}** coins!`);
            }

            const biz = userBizs.find(b => {
                const type = bizConfig.TYPES[b.business_id];
                return type.id.toLowerCase() === inputId || type.numeric_id.toString() === inputId;
            });

            if (!biz) return message.reply('❌ You dont own this business or invaild ID!');

            const hours = args[2] ? Math.max(1, parseInt(args[2]) || 1) : 1;
            const totalCost = costPerHour * hours;
            const bizId = biz.business_id;

            if (user.balance < totalCost) {
                return message.reply(`❌ You need **${totalCost.toLocaleString()}** coins to hire a manager!`);
            }

            await db.removeBalance(message.author.id, totalCost);
            const currentExpires = biz.manager_expires_at || 0;
            const newExpiresAt = Math.max(now, currentExpires) + (hours * 3600);
            await db.updateUserBusiness(message.author.id, bizId, { manager_expires_at: newExpiresAt });

            return message.reply(t('business.staff_success', lang, { name: bizConfig.TYPES[bizId].name[lang], hours: hours }));
        }

        if (sub === 'list') {
            const embed = new EmbedBuilder()
                .setTitle('💼 Business Market')
                .setColor(config.COLORS.INFO)
                .setDescription('Use `$business buy <id>` to start your empire.');

            Object.values(bizConfig.TYPES).forEach(b => {
                embed.addFields({
                    name: `${b.icon} ${b.name[lang]} (ID: \`${b.numeric_id}\`)`,
                    value: `💰 **${b.base_price.toLocaleString()}** coins\n📈 Base Income: **${b.base_income.toLocaleString()}** coins/hour\n⭐ Max Level: **${b.max_level}**`
                });
            });

            return message.channel.send({ embeds: [embed] });
        }
    }
};
