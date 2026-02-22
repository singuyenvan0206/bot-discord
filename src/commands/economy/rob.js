const db = require('../../database');
const { addXp, getLevelMultiplier, checkAndSendMilestone } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
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
        const isVictimPolice = victim.job === 'police';

        const { hasActiveItem } = require('../../utils/multiplier');
        const hasVictimShield = hasActiveItem(target.id, 6); // Shield item ID

        let baseSuccessChance = config.ECONOMY.ROB_SUCCESS_CHANCE + (isCriminal ? 0.1 : 0);

        // Interaction: Police Protection / Shield
        if (isVictimPolice || hasVictimShield) {
            baseSuccessChance /= 2;
        }

        const isSuccess = Math.random() < baseSuccessChance;

        if (isSuccess) {
            let percent = Math.random() * 0.4 + 0.1;
            if (isCriminal) percent += 0.05; // Extra 5% for criminals

            let stolen = Math.floor(victim.balance * percent);

            // Item Interaction: Multipliers
            const { getUserMultiplier } = require('../../utils/multiplier');
            const itemMulti = getUserMultiplier(message.author.id, 'income');
            const itemBonus = Math.floor(stolen * itemMulti);
            stolen += itemBonus;

            // Ensure we don't steal more than they have total
            stolen = Math.min(stolen, victim.balance);

            db.addBalance(message.author.id, stolen);
            db.addBalance(target.id, -stolen);

            // Robbery gives high XP (30-60)
            const xpGained = Math.floor(Math.random() * 31) + 30;
            const xpResult = addXp(message.author.id, xpGained);

            let msg = t('rob.success', lang, {
                user: target.username,
                amount: stolen.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (itemBonus > 0) {
                msg += t('rob.thief_edge', lang, { amount: itemBonus.toLocaleString() });
            }

            await message.reply(msg);

            return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
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

            let msg = t('rob.failure', lang, {
                user: target.username,
                amount: penalty.toLocaleString()
            });

            if (isVictimPolice) {
                msg += t('rob.police_busted', lang);
            } else if (hasVictimShield) {
                msg += t('rob.shield_blocked', lang);
            }

            await message.reply(msg);

            const xpResult = addXp(message.author.id, 5); // 5 XP for failed robbery
            return checkAndSendMilestone(message, xpResult.reachedLevel20, lang);
        }
    }
};
