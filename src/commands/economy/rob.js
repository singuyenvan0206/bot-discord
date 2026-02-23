const db = require('../../database');
const { getLevelMultiplier, deductLevel } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const { hasActiveItem, isProtectedFromRob, calculateReward } = require('../../utils/multiplier');
const config = require('../../config');

module.exports = {
    name: 'rob',
    aliases: ['steal'],
    description: 'Rob coins from another user',
    cooldown: config.ECONOMY.ROB_COOLDOWN,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const now = Math.floor(Date.now() / 1000);
        const cooldown = config.ECONOMY.ROB_COOLDOWN;

        if (now - user.last_rob < cooldown) {
            const remaining = (user.last_rob + cooldown) - now;
            const minutes = Math.ceil(remaining / 60);
            return message.reply(t('rob.cooldown', lang, { minutes }));
        }

        const target = message.mentions.users.first();
        if (!target) return message.reply(t('rob.invalid_user', lang));
        if (target.id === message.author.id) return message.reply(t('rob.invalid_user', lang));
        if (target.bot) return message.reply(t('rob.invalid_user', lang));

        const victim = db.getUser(target.id);
        if (victim.balance <= 0) return message.reply(t('rob.no_money', lang, { user: target.username }));
        if (user.balance < 100) return message.reply(t('rob.no_money_self', lang));

        db.updateUser(message.author.id, { last_rob: now });

        const isCriminal = user.job === 'criminal';
        const isSoldier = user.job === 'soldier';
        const isVictimPolice = victim.job === 'police';

        const hasVictimShield = hasActiveItem(target.id, 202); // Shield (ID 202)
        const hasVictimRobShield = isProtectedFromRob(target.id); // Shield of Protection (503)

        let baseSuccessChance = config.ECONOMY.ROB_SUCCESS_CHANCE;
        if (isCriminal) baseSuccessChance += 0.10;
        if (isSoldier) baseSuccessChance += 0.10;

        // Interaction: Police/Shield protection
        if (isVictimPolice || hasVictimShield || hasVictimRobShield) {
            baseSuccessChance /= 2;
        }

        const isSuccess = Math.random() < baseSuccessChance;

        if (isSuccess) {
            const targetBalance = victim.balance;
            let baseSteal = Math.floor(targetBalance * (Math.random() * 0.15 + 0.1)); // 10-25% of victim's balance

            // Bonus: if robbing a Police officer, criminal earns +50%
            let policeRobMsg = '';
            if (isVictimPolice && isCriminal) {
                baseSteal = Math.floor(baseSteal * 1.5);
                policeRobMsg = t('rob.police_bounty', lang);
            }

            const { total: stolen, bonus: bonusAmount } = calculateReward(baseSteal, message.author.id);

            // Ensure we don't steal more than they have total
            const finalStolen = Math.min(stolen, victim.balance);

            db.addBalance(message.author.id, finalStolen);
            db.addBalance(target.id, -finalStolen);



            let msg = t('rob.success', lang, {
                user: target.username,
                amount: finalStolen.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonusAmount > 0) {
                msg += `\n-# *(${lang === 'vi' ? 'Gồm 🎁 Thưởng (Capped 250%)' : 'Includes 🎁 Bonus (Capped 250%)'}: +${bonusAmount.toLocaleString()} coins)*`;
            }
            if (policeRobMsg) msg += policeRobMsg;

            return message.reply(msg);
        } else {
            // Pay 20% of your balance to the victim
            let penaltyPercent = config.ECONOMY.ROB_FAIL_PENALTY_PERCENT;

            // Interaction: Counter-Rob (Penalty doubled if robbing police)
            if (isVictimPolice) {
                penaltyPercent *= 2;
            }

            const penalty = Math.floor(user.balance * penaltyPercent);
            db.addBalance(message.author.id, -penalty);
            db.addBalance(target.id, penalty);

            let failMsg = t('rob.failure', lang, {
                user: target.username,
                amount: penalty.toLocaleString()
            });

            if (user.job === 'teacher') {
                const result = deductLevel(message.author.id);
                failMsg += `\n👨‍🏫 **Teacher Penalty:** ${t('rob.teacher_penalty', lang, { level: result.newLevel })}`;
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
