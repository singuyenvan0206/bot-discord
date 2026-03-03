const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { calculateNetWorth } = require('../../utils/economy');
const { calculateLevel } = require('../../utils/leveling');
const housingConfig = require('../../config/housing');
const bizConfig = require('../../config/businesses');

module.exports = {
    name: 'profile',
    aliases: ['pf', 'pr', 'p'],
    description: 'Xem hồ sơ cá nhân, tài sản và cấp độ (View your personal profile, assets, and level)',
    skipXp: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null)
            || message.author;

        const dbUser = await db.getUser(user.id, message.guild.id);
        const inv = JSON.parse(dbUser.inventory || '{}');
        const itemCount = Object.values(inv).reduce((a, b) => a + b, 0);

        // Calculate Net Worth using utility
        const netWorth = calculateNetWorth(dbUser);

        // Get the member object for the target user in the current guild
        const targetMember = await message.guild.members.fetch(user.id).catch(() => null);

        // Get actual multipliers (%)
        const { getTotalMultiplier, getXpMultiplier, getDynamicCap } = require('../../utils/multiplier');
        const incomeBonus = Math.round(await getTotalMultiplier(targetMember || user.id, 'income', message.guild.id) * 100);
        const gambleBonus = Math.round(await getTotalMultiplier(targetMember || user.id, 'gamble', message.guild.id) * 100);
        const xpBonus = Math.round((await getXpMultiplier(targetMember || user.id, message.guild.id) - 1.0) * 100);
        const maxCapPercent = Math.round(await getDynamicCap(targetMember || user.id, message.guild.id) * 100);

        // Find Rank (Position in guild-specific balance top)
        const topBalance = await db.getTopUsers(message.guild.id, 100, 'balance');
        const rankIndex = topBalance.findIndex(u => u.id === user.id);
        const rank = rankIndex === -1 ? t('profile.unranked', lang) : `#${rankIndex + 1}`;

        // Calculate XP Progress
        const currentLevelXp = Math.floor(Math.pow((dbUser.level || 0) / 0.1, 2));
        const nextLevelXp = Math.floor(Math.pow(((dbUser.level || 0) + 1) / 0.1, 2));
        const xpNeeded = nextLevelXp - currentLevelXp;
        const xpProgress = (dbUser.xp || 0) - currentLevelXp;
        const progressPercent = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100));

        // Create Progress Bar (20 blocks)
        const totalBlocks = 10;
        const filledBlocks = Math.floor((progressPercent / 100) * totalBlocks);
        const emptyBlocks = totalBlocks - filledBlocks;
        const progressBar = '▮'.repeat(filledBlocks) + '▯'.repeat(emptyBlocks);

        // Marriage Status
        const marriage = await db.getMarriage(message.guild.id, user.id);
        let marriageStatus = t('common.none', lang);
        if (marriage) {
            const partnerId = marriage.user1_id === user.id ? marriage.user2_id : marriage.user1_id;
            const partnerUser = await message.client.users.fetch(partnerId).catch(() => null);
            const partnerName = partnerUser ? partnerUser.tag : `ID: ${partnerId}`;

            const bonus = marriage.ring_id === 702 ? 50 : 25;
            marriageStatus = `💍 **${partnerName}**\n↳ ${t('profile.marriage_bonus', lang, { percent: bonus.toLocaleString() })}`;
        }

        // Housing & Business info
        const houseTier = dbUser.house_id ? housingConfig.TIERS[dbUser.house_id] : null;
        const userBizs = await db.getUserBusinesses(user.id);
        let totalPassiveIncome = 0;
        userBizs.forEach(b => {
            totalPassiveIncome += bizConfig.calculateBusinessIncome(b.business_id, b.level, b.staff);
        });

        const embed = new EmbedBuilder()
            .setAuthor({
                name: t('profile.title', lang, { user: user.tag }),
                iconURL: user.displayAvatarURL({ dynamic: true, size: 256 })
            })
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor(config.COLORS.INFO)
            .setDescription(` ${t('profile.identity_section', lang)} ${'\u3164'.repeat(25)}`)
            .addFields(
                {
                    name: `👤 ${t('userinfo.username', lang)}`,
                    value: `**${user.username}**\n`,
                    inline: true
                },
                {
                    name: `📅 ${t('profile.joined', lang)}`,
                    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`,
                    inline: true
                },
                {
                    name: `💼 ${t('job.name_field', lang)}`,
                    value: dbUser.job ? t(`job.name_${dbUser.job}`, lang) : t('job.none', lang),
                    inline: true
                },

                { name: '\u200B', value: ` ${t('profile.economy_section', lang)} ${'\u3164'.repeat(25)}`, inline: false },
                {
                    name: t('profile.economy', lang),
                    value: `${config.EMOJIS.COIN} **${dbUser.balance.toLocaleString()}**\n↳ ${t('profile.net_worth', lang, { emoji: '', amount: netWorth.toLocaleString() })}`,
                    inline: true
                },
                {
                    name: t('profile.ranking', lang),
                    value: `🏆 **${rank}**\n↳ ${t('profile.wealth_rank', lang, { rank: '' }).replace(':', '').trim()}`,
                    inline: true
                },
                {
                    name: t('profile.assets', lang),
                    value: `${houseTier ? `${houseTier.icon} ${houseTier.name[lang]} (+${(houseTier.income_buff * 100).toLocaleString()}% Cash)` : t('housing.info_none', lang)}\n🏢 ${t('business.info_count', lang, { count: userBizs.length.toLocaleString() })}`,
                    inline: true
                },

                { name: '\u200B', value: ` ${t('profile.progression_section', lang)} ${'\u3164'.repeat(25)}`, inline: false },
                {
                    name: `${t('profile.level_label', lang)} ${dbUser.level.toLocaleString()}`,
                    value: `\`${progressBar}\` **${Math.floor(progressPercent)}%**\n${Math.floor(dbUser.xp).toLocaleString()} / ${Math.floor(nextLevelXp).toLocaleString()} XP`,
                    inline: false
                },
                {
                    name: t('profile.multipliers', lang),
                    value: `💼 **${incomeBonus}%** | 🎲 **${gambleBonus}%** | ✨ **${xpBonus}%**\n🛡️ ${t('profile.cap', lang)}: **${maxCapPercent}%**`,
                    inline: true
                },
                {
                    name: t('profile.passive_income', lang),
                    value: `**+${totalPassiveIncome.toLocaleString()}** coins/hr`,
                    inline: true
                },

                { name: '\u200B', value: ` ${t('profile.social_section', lang)} ${'\u3164'.repeat(25)}`, inline: false },
                {
                    name: t('profile.marriage', lang),
                    value: marriageStatus,
                    inline: true
                },
                {
                    name: t('profile.collection', lang),
                    value: t('profile.total_items', lang, { count: itemCount.toLocaleString() }) + '\n' + t('profile.item_types', lang, { count: Object.keys(inv).length.toLocaleString() }),
                    inline: true
                }
            )
            .setFooter({ text: t('profile.footer', lang, { prefix: config.PREFIX }) })
            .setTimestamp();

        // Add banner if possible
        const fetchedUser = await user.fetch(true).catch(() => null);
        if (fetchedUser?.bannerURL()) {
            embed.setImage(fetchedUser.bannerURL({ dynamic: true, size: 1024 }));
        }

        return message.reply({ embeds: [embed] });
    }
};
