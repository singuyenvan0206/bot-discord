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
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = db.getGuildSetting(message.guild.id, 'rob_cooldown', config.ECONOMY.ROB_COOLDOWN);
        const lastRob = Number(user.last_rob || 0);

        const isAlreadyOnCooldown = (now - lastRob < cooldown);

        if (isAlreadyOnCooldown) {
            const timeLeft = cooldown - (now - lastRob);
            return message.reply(t('rob.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const clearCooldown = () => {
            if (!isAlreadyOnCooldown && message.client.cooldowns?.has('rob')) {
                message.client.cooldowns.get('rob').delete(message.author.id);
            }
        };

        const target = message.mentions.users.first();
        if (!target) {
            clearCooldown();
            return message.reply(t('rob.invalid_user', lang));
        }
        if (target.id === message.author.id) {
            clearCooldown();
            return message.reply(t('rob.invalid_user', lang));
        }
        if (target.bot) {
            clearCooldown();
            return message.reply(t('rob.invalid_user', lang));
        }
        if (db.isOwner(target.id)) {
            clearCooldown();
            return message.reply(t('rob.target_owner', lang));
        }

        const victim = db.getUser(target.id, message.guild.id);
        if ((victim.balance || 0) <= 0) return message.reply(t('rob.no_money', lang, { user: target.username }));
        if ((user.balance || 0) < 100) return message.reply(t('rob.no_money_self', lang));

        db.updateUser(message.guild.id, message.author.id, { last_rob: now });

        const isCriminal = user.job === 'criminal';
        const isSoldier = user.job === 'soldier';
        const isVictimPolice = victim.job === 'police';

        const hasVictimShield = hasActiveItem(message.guild.id, target.id, 202); // Shield (ID 202)
        const hasVictimRobShield = isProtectedFromRob(message.guild.id, target.id); // Shield of Protection (502)

        let baseSuccessChance = config.ECONOMY.ROB_SUCCESS_CHANCE;
        if (isCriminal) baseSuccessChance += 0.10;
        if (isSoldier) baseSuccessChance += 0.10;

        // Interaction: Police/Shield protection
        if (isVictimPolice || hasVictimShield || hasVictimRobShield) {
            baseSuccessChance /= 2;
        }

        const isSuccess = Math.random() < baseSuccessChance;

        if (isSuccess) {
            const targetBalance = (victim.balance || 0);
            let baseSteal = Math.floor(targetBalance * (Math.random() * 0.05 + 0.05)); // 5-10% of victim's balance

            // Bonus: if robbing a Police officer, criminal earns +50%
            let policeRobMsg = '';
            if (isVictimPolice && isCriminal) {
                baseSteal = Math.floor(baseSteal * 1.5);
                policeRobMsg = t('rob.police_bounty', lang);
            }

            // Ensure we don't steal more than they have total
            const victimLoss = Math.min(baseSteal, (victim.balance || 0));

            const { total: robberGain, bonus, percent } = calculateReward(victimLoss, message.member, 'income');

            db.addBalance(message.guild.id, message.author.id, robberGain);
            db.removeBalance(message.guild.id, target.id, victimLoss);

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

            const xpResult = deductXp(message.author.id, message.guild.id, xpLoss);
            db.removeBalance(message.guild.id, message.author.id, penalty);
            db.addBalance(message.guild.id, target.id, penalty);

            // Cooldown Penalty: Busted Time (2x cooldown)
            const bustedCooldown = config.ECONOMY.ROB_COOLDOWN;
            db.updateUser(message.guild.id, message.author.id, { last_rob: now + bustedCooldown });

            // Item Breakage: 15% chance to lose Sneakers (204) or Shield (202)
            let itemBrokenMsg = '';
            if (Math.random() < 0.15) {
                if (removeActiveBuff(message.guild.id, message.author.id, 204)) {
                    itemBrokenMsg = t('common.item_broken', lang, { item: t('items.204.name', lang) });
                } else if (removeActiveBuff(message.guild.id, message.author.id, 202)) {
                    itemBrokenMsg = t('common.item_broken', lang, { item: t('items.202.name', lang) });
                }
            }

            let failMsg = t('rob.failure_xp', lang, {
                user: target.username,
                amount: penalty.toLocaleString(),
                xp: xpResult.deducted,
                jail: t('common.jail_time', lang)
            });

            if (itemBrokenMsg) failMsg += itemBrokenMsg;

            if (user.job === 'teacher') {
                const result = deductLevel(message.author.id, message.guild.id);
                failMsg += `\n${t('common.teacher_penalty_label', lang)}${t('rob.teacher_penalty', lang, { level: result.newLevel })}`;
            }

            if (isVictimPolice) {
                failMsg += t('rob.police_busted', lang);
            } else if (hasVictimRobShield) {
                failMsg += t('rob.rob_shield_blocked', lang);
            } else if (hasVictimShield) {
                failMsg += t('rob.shield_blocked', lang);
            }

            await message.reply(failMsg);

            return;
        }
    }
};
