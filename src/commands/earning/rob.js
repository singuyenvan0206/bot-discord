const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const { deductLevel, deductXp } = require('../../utils/leveling');
const { hasActiveItem, isProtectedFromRob, calculateReward, removeActiveBuff } = require('../../utils/multiplier');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'rob',
    aliases: ['r', 'rb', 'steal'],
    description: 'Cướp tiền (Rob someone)',
    cooldown: config.ECONOMY.ROB_COOLDOWN,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = await db.getGuildSetting(message.guild.id, 'rob_cooldown', config.ECONOMY.ROB_COOLDOWN);
        const lastRob = Number(user.last_rob || 0);

        const isAlreadyOnCooldown = (now - lastRob < cooldown);

        if (isAlreadyOnCooldown) {
            const timeLeft = cooldown - (now - lastRob);
            return message.reply(t('rob.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const target = message.mentions.users.first();
        if (!target || target.id === message.author.id || target.bot) {
            return message.reply(t('rob.invalid_user', lang));
        }

        const victim = await db.getUser(target.id, message.guild.id);
        if ((victim.balance || 0) <= 0) return message.reply(t('rob.no_money', lang, { user: target.username }));
        if ((user.balance || 0) < 100) return message.reply(t('rob.no_money_self', lang));

        // Valid attempt - Set Cooldowns
        const timestamps = message.client.cooldowns.get('rob');
        const cooldownAmount = (this.cooldown || config.ECONOMY.ROB_COOLDOWN) * 1000;
        timestamps.set(message.author.id, Date.now());
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        await db.updateUser(message.guild.id, message.author.id, { last_rob: now });

        const isCriminal = user.job === 'criminal';
        const isSoldier = user.job === 'soldier';
        const isVictimPolice = victim.job === 'police';

        const hasVictimRobShield = await isProtectedFromRob(message.guild.id, target.id); // Shield of Protection (501)

        let baseSuccessChance = config.ECONOMY.ROB_SUCCESS_CHANCE;
        if (isCriminal) baseSuccessChance += 0.10;
        if (isSoldier) baseSuccessChance += 0.10;


        if (isVictimPolice || hasVictimRobShield) {
            baseSuccessChance /= 2;
        }

        const isSuccess = Math.random() < baseSuccessChance;

        if (isSuccess) {
            // Base Steal calculation (5-10% of victim's balance)
            const targetBalance = (victim.balance || 0);
            let baseSteal = Math.floor(targetBalance * (Math.random() * 0.05 + 0.05));

            let policeRobMsg = '';
            if (isVictimPolice && isCriminal) {
                baseSteal = Math.floor(baseSteal * 1.5);
                policeRobMsg = t('rob.police_bounty', lang);
            }

            // Ensure we don't steal more than they have total
            const victimLoss = Math.min(baseSteal, targetBalance);

            const { total: robberGain, bonus, percent } = await calculateReward(victimLoss, message.member, 'income', { pvpMode: true });

            await db.addBalance(message.guild.id, message.author.id, robberGain);
            await db.removeBalance(message.guild.id, target.id, victimLoss);

            let msg = t('rob.success', lang, {
                user: target.username,
                amount: victimLoss.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonus > 0) {
                msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
            }
            if (policeRobMsg) msg += policeRobMsg;

            return message.reply(msg);
        } else {
            // New Scaled Penalty: (level * 500) + (5% of balance)
            let penalty = (user.level * 500) + Math.floor((user.balance || 0) * 0.05);
            const xpLoss = 50;

            // Interaction: Counter-Rob (Penalty doubled if robbing police)
            if (isVictimPolice) {
                penalty *= 2;
            }

            const xpResult = await deductXp(message.author.id, message.guild.id, xpLoss);
            await db.removeBalance(message.guild.id, message.author.id, penalty);
            await db.addBalance(message.guild.id, target.id, penalty);

            // Penalty applied - last_rob already updated above


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
            }

            await message.reply(failMsg);

            return;
        }
    }
};
