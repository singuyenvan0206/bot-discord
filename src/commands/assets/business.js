const { EmbedBuilder } = require('discord.js');
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
            if (inputId !== 'all') {
                return message.reply(t('business.sell_usage', lang) || "❌ Cách dùng: `$business sell all` để bán tất cả doanh nghiệp.");
            }

            const userBizs = await db.getUserBusinesses(message.author.id);
            if (userBizs.length === 0) {
                return message.reply(t('business.sell_error_none', lang) || "❌ Bạn chưa có doanh nghiệp nào để bán!");
            }

            let totalValue = 0;
            for (const b of userBizs) {
                const type = bizConfig.TYPES[b.business_id];
                if (type) totalValue += type.base_price;
            }

            const refund = Math.floor(totalValue * 0.5);

            await db.removeAllUserBusinesses(message.author.id);
            await db.addBalance(message.author.id, refund);

            return message.reply(t('business.sell_all_success', lang, { price: refund.toLocaleString() }) || `💰 Bạn đã bán toàn bộ doanh nghiệp và nhận lại **${refund.toLocaleString()}** coins (50% giá gốc).`);
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
                    const hourly = bizConfig.calculateBusinessIncome(b.business_id, b.level, b.staff);
                    totalIncome += hourly;

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
                            income: hourly.toLocaleString(),
                            staff: b.staff,
                            upgrade_cost: upgradeCost,
                            staff_cost: bizConfig.STAFF_COST.toLocaleString()
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
                const hourly = bizConfig.calculateBusinessIncome(b.business_id, b.level, b.staff);

                const secondsPassed = now - b.last_harvest;
                const hoursPassed = secondsPassed / 3600;

                if (hoursPassed >= 1) {
                    const amount = Math.floor(hourly * hoursPassed);
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
            if (!inputId) return message.reply('❌ Please specify the business ID to upgrade!');

            const userBizs = await db.getUserBusinesses(message.author.id);
            const biz = userBizs.find(b => {
                const type = bizConfig.TYPES[b.business_id];
                return type.id.toLowerCase() === inputId || type.numeric_id.toString() === inputId;
            });

            if (!biz) return message.reply('❌ You dont own this business or invaild ID!');

            const bizId = biz.business_id;
            const type = bizConfig.TYPES[bizId];
            if (biz.level >= type.max_level) return message.reply('❌ This business is already at maximum level!');

            const upgradeCost = Math.floor(type.base_price * Math.pow(bizConfig.UPGRADE_COST_MULTIPLIER, biz.level));
            const user = await db.getUser(message.author.id);

            if (user.balance < upgradeCost) {
                return message.reply(`❌ You need **${upgradeCost.toLocaleString()}** coins for this upgrade!`);
            }

            await db.removeBalance(message.author.id, upgradeCost);
            await db.updateUserBusiness(message.author.id, bizId, { level: biz.level + 1 });

            return message.reply(t('business.upgrade_success', lang, { level: biz.level + 1 }));
        }

        if (sub === 'hire') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (!inputId) return message.reply('❌ Please specify the business ID to hire staff!');

            const userBizs = await db.getUserBusinesses(message.author.id);
            if (userBizs.length === 0) return message.reply(t('business.sell_error_none', lang) || '❌ You don\'t own any businesses!');

            const user = await db.getUser(message.author.id);
            const cost = bizConfig.STAFF_COST;

            if (inputId === 'all') {
                const totalCost = userBizs.length * cost;

                if (user.balance < totalCost) {
                    return message.reply(t('business.hire_all_funds', lang, { price: totalCost.toLocaleString() }) || `❌ Bạn cần **${totalCost.toLocaleString()}** coins để thuê nhân viên cho tất cả doanh nghiệp!`);
                }

                await db.removeBalance(message.author.id, totalCost);
                for (const b of userBizs) {
                    await db.updateUserBusiness(message.author.id, b.business_id, { staff: b.staff + 1 });
                }

                return message.reply(t('business.hire_all_success', lang, { price: totalCost.toLocaleString() }) || `✅ Bạn đã thuê thêm 1 nhân viên cho toàn bộ doanh nghiệp với giá **${totalCost.toLocaleString()}** coins!`);
            }

            const biz = userBizs.find(b => {
                const type = bizConfig.TYPES[b.business_id];
                return type.id.toLowerCase() === inputId || type.numeric_id.toString() === inputId;
            });

            if (!biz) return message.reply('❌ You dont own this business or invaild ID!');

            const bizId = biz.business_id;

            if (user.balance < cost) {
                return message.reply(`❌ You need **${cost.toLocaleString()}** coins to hire a staff member!`);
            }

            await db.removeBalance(message.author.id, cost);
            await db.updateUserBusiness(message.author.id, bizId, { staff: biz.staff + 1 });

            return message.reply(t('business.staff_success', lang, { name: bizConfig.TYPES[bizId].name[lang] }));
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
