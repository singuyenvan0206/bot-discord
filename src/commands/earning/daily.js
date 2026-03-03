const db = require('../../database');
const { getUserMultiplier, getTotalIncomeMultiplier, calculateReward } = require('../../utils/multiplier');
const { getLevelMultiplier } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'daily',
    aliases: ['dy', 'd'],
    description: 'Nhận quà tặng coins miễn phí hàng ngày (Claim your free daily coin reward)',
    cooldown: config.ECONOMY.DAILY_COOLDOWN,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        const user = await db.getUser(message.author.id, message.guild.id);
        const cooldown = await db.getGuildSetting(message.guild.id, 'daily_cooldown', config.ECONOMY.DAILY_COOLDOWN);
        const lastDaily = Number(user.last_daily || 0);
        const now = Math.floor(Date.now() / 1000);

        if (now - lastDaily < cooldown) {
            const timeLeft = cooldown - (now - lastDaily);
            const { formatDuration } = require('../../utils/time');
            return message.reply(t('daily.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const baseReward = await db.getGuildSetting(message.guild.id, 'daily_reward', config.ECONOMY.DAILY_REWARD);
        let { total, bonus, percent } = await calculateReward(baseReward, message.member, 'daily');

        // Chef Interaction: Michelin Star (10% chance — daily ×3)
        let eventMsg = '';
        if (user.job === 'chef' && Math.random() < 0.08) {
            total = Math.floor(total * 1.5);
            eventMsg = t('daily_events.michelin_star', lang);
        }

        // Doctor Interaction: Medical Trial (15% chance +1000-3000 coins)
        if (user.job === 'doctor' && Math.random() < 0.15) {
            const grant = Math.floor(Math.random() * 2001) + 1000;
            total += grant;
            eventMsg += t('daily_events.medical_trial', lang, { amount: grant.toLocaleString() });
        }

        // Streamer Interaction: Subathon (20% chance +3x bonus)
        if (user.job === 'streamer' && Math.random() < 0.15) {
            const subBonus = Math.floor(total * 0.5);
            total += subBonus;
            eventMsg += t('daily_events.subathon', lang, { amount: subBonus.toLocaleString() });
        }

        await db.updateUser(message.guild.id, message.author.id, { last_daily: now });
        await db.addBalance(message.guild.id, message.author.id, total);

        let msg = t('daily.success', lang, { amount: total.toLocaleString(), emoji: config.EMOJIS.COIN });
        if (bonus > 0) {
            msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
        }
        if (eventMsg) msg += eventMsg;

        return message.reply(msg);
    }
};
