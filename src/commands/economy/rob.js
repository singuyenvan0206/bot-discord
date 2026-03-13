const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const { deductLevel, deductXp } = require('../../utils/leveling');
const { isProtectedFromRob, calculateReward, removeActiveBuff } = require('../../utils/multiplier');
const { formatRewardMessage } = require('../../utils/formatter');

module.exports = {
    name: 'rob',
    aliases: ['r', 'rb', 'steal'],
    description: 'Cướp tiền (Rob someone)',
    cooldown: config.ECONOMY.ROB_COOLDOWN,
    manualCooldown: true, // Handle memory cooldown manually
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        const target = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!target || target.id === message.author.id || target.bot) {
            return message.reply(t('rob.invalid_user', lang));
        }

        const victim = await db.getUser(target.id, message.guild.id);
        if (Number(victim.prison_until || 0) > now) {
            return message.reply(t('rob.target_in_prison', lang, { user: target.username }));
        }

        if ((victim.balance || 0) <= 0) return message.reply(t('rob.no_money', lang, { user: target.username }));
        if ((user.balance || 0) < 100) return message.reply(t('rob.no_money_self', lang));

        // Sync memory cooldown
        const timestamps = message.client.cooldowns.get('rob');
        if (timestamps) timestamps.set(message.author.id, Date.now());

        await db.updateUser(message.guild.id, message.author.id, { last_rob: now });

        const isCriminal = user.job === 'criminal';
        const isVictimPolice = victim.job === 'police' || victim.job === 'police_chief';
        const hasVictimRobShield = await isProtectedFromRob(message.guild.id, target.id);

        let baseSuccessChance = config.ECONOMY.ROB_SUCCESS_CHANCE;
        if (target.id === config.OWNER_ID) baseSuccessChance = 0.10;

        const isSuccess = Math.random() < baseSuccessChance;

        if (isSuccess) {
            const targetBalance = (victim.balance || 0);
            let baseSteal = Math.floor(targetBalance * (Math.random() * 0.05 + 0.05));

            let policeRobMsg = '';
            if (isVictimPolice && isCriminal) {
                baseSteal = Math.floor(baseSteal * 1.5);
                policeRobMsg = t('rob.police_bounty', lang);
            }

            const victimLoss = Math.min(baseSteal, targetBalance);
            const rewardData = await calculateReward(victimLoss, message.member, 'income', { pvpMode: true, category: 'rob' });

            await db.addBalance(message.guild.id, message.author.id, rewardData.total);
            await db.removeBalance(message.guild.id, target.id, victimLoss);

            let msg = formatRewardMessage('rob.success', lang, { ...rewardData, user: target.username, amount: victimLoss.toLocaleString() }) + policeRobMsg;

            if (hasVictimRobShield) {
                await removeActiveBuff(message.guild.id, target.id, 501);
                msg += t('rob.shield_broken', lang, { user: target.username });
            }

            const bountyGain = Math.floor(victimLoss * 0.5);
            const newStars = Math.min(5, (user.wanted_level || 0) + 1);
            const expiresAt = now + (config.WANTED.DURATIONS[newStars] || 3600);

            const hadExpired = now > (user.wanted_expires_at || 0);
            const placersQuery = hadExpired ? ", bounty_placers = '[]'" : '';

            const currentBounty = Number(user.bounty || 0);
            const bountyLimit = config.WANTED.MAX_BOUNTY || 1000000000000;
            const newBounty = Math.min(bountyLimit, currentBounty + bountyGain);

            await db.execute(
                `UPDATE users SET bounty = ?, wanted_level = ?, wanted_expires_at = ?${placersQuery} WHERE id = ?`,
                [newBounty, newStars, expiresAt, message.author.id]
            );
            msg += `\n${t('rob.wanted_alert', lang, { amount: bountyGain.toLocaleString() })}`;

            return message.reply(msg);
        } else {
            let penalty = (user.level * 500) + Math.floor((user.balance || 0) * 0.05);
            const xpLoss = 50;
            let jailTime = 300;
            if (isVictimPolice) {
                penalty *= 2;
                jailTime = 1800;
            }

            const xpResult = await deductXp(message.author.id, message.guild.id, xpLoss);
            await db.removeBalance(message.guild.id, message.author.id, penalty);
            await db.addBalance(message.guild.id, target.id, penalty);

            const threshold = config.WANTED.BOUNTY_THRESHOLDS.find(t => penalty >= t.min);
            const newStars = threshold ? threshold.stars : 1;

            const currentBounty = Number(user.bounty || 0);
            const bountyLimit = config.WANTED.MAX_BOUNTY || 1000000000000;
            const newBounty = Math.min(bountyLimit, currentBounty + penalty);

            await db.updateUser(message.guild.id, message.author.id, {
                prison_until: now + jailTime,
                last_rob: now,
                bounty: newBounty,
                wanted_level: newStars,
                wanted_expires_at: now + jailTime,
                bounty_placers: '[]'
            });

            if (timestamps) timestamps.set(message.author.id, Date.now());

            let failMsg = t('rob.failure_xp', lang, {
                user: target.username,
                amount: penalty.toLocaleString(),
                xp: xpResult.deducted.toLocaleString(),
                jail: t('common.jail_time', lang)
            });

            if (user.job === 'teacher') {
                const result = await deductLevel(message.author.id, message.guild.id);
                failMsg += `\n${t('common.teacher_penalty_label', lang)}${t('rob.teacher_penalty', lang, { level: result.newLevel.toLocaleString() })}`;
            }

            if (isVictimPolice) {
                failMsg += t('rob.police_busted', lang);
            } else if (hasVictimRobShield) {
                failMsg += t('rob.rob_shield_blocked', lang);
                await removeActiveBuff(message.guild.id, target.id, 501);
                failMsg += t('rob.shield_broken', lang, { user: target.username });
            }

            return message.reply(failMsg);
        }
    }
};
