const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t } = require('../../utils/i18n');
const config = require('../../config');
const bizConfig = require('../../config/businesses');

module.exports = {
    name: 'business',
    description: 'Manage your business empire',
    aliases: ['biz', 'kinhdoanh'],
    async execute(message, args, lang) {
        const sub = args[0] ? args[0].toLowerCase() : 'info';

        if (sub === 'buy') {
            const typeId = args[1] ? args[1].toLowerCase() : null;
            if (!typeId || !bizConfig.TYPES[typeId]) {
                const list = Object.values(bizConfig.TYPES).map(b => `\`${b.id}\` (${b.base_price.toLocaleString()} coins)`).join(', ');
                return message.reply(`${t('business.buy_usage', lang)}\nAvailable: ${list}`);
            }

            const type = bizConfig.TYPES[typeId];
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

                    embed.addFields({
                        name: t('business.info_item', lang, {
                            icon: type.icon,
                            name: type.name[lang],
                            level: b.level,
                            income: hourly.toLocaleString(),
                            staff: b.staff
                        }),
                        value: ' '
                    });
                });
                embed.setDescription(`📈 **Total Passive Income:** ${totalIncome.toLocaleString()} coins/hour`);
                embed.setFooter({ text: 'Use $business collect to harvest' });
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
            const bizId = args[1] ? args[1].toLowerCase() : null;
            const userBizs = await db.getUserBusinesses(message.author.id);
            const biz = userBizs.find(b => b.business_id === bizId);

            if (!biz) return message.reply('❌ You dont own this business or forgot to specify the ID!');

            const type = bizConfig.TYPES[biz.business_id];
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
            const bizId = args[1] ? args[1].toLowerCase() : null;
            const userBizs = await db.getUserBusinesses(message.author.id);
            const biz = userBizs.find(b => b.business_id === bizId);

            if (!biz) return message.reply('❌ Specify which business to hire staff for!');

            const cost = bizConfig.STAFF_COST;
            const user = await db.getUser(message.author.id);

            if (user.balance < cost) {
                return message.reply(`❌ You need **${cost.toLocaleString()}** coins to hire a staff member!`);
            }

            await db.removeBalance(message.author.id, cost);
            await db.updateUserBusiness(message.author.id, bizId, { staff: biz.staff + 1 });

            return message.reply(t('business.staff_success', lang, { name: bizConfig.TYPES[biz.business_id].name[lang] }));
        }
    }
};
