const db = require('../../database');
const { deductLevel, deductXp } = require('../../utils/leveling');
const { calculateReward } = require('../../utils/multiplier');
const { addHouseProfit } = require('../../utils/economy');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { formatRewardMessage } = require('../../utils/formatter');
const { handleCrimeJobInteractions } = require('../../utils/jobInteractions');

module.exports = {
    name: 'crime',
    aliases: ['cr'],
    description: 'Thực hiện các phi vụ bất hợp pháp (Commit illegal heists for fast cash)',
    cooldown: config.ECONOMY.CRIME_COOLDOWN,
    manualCooldown: true, // Handle memory cooldown sync manually 
    async execute(message, args) {
        try {
            const lang = await getLanguage(message.author.id, message.guild?.id);
            const user = await db.getUser(message.author.id, message.guild.id);
            const now = Math.floor(Date.now() / 1000);

        const isCriminal = user.job === 'criminal';
        const isHacker = user.job === 'hacker';
        let successRate = await db.getGuildSetting(message.guild.id, 'crime_rate', config.ECONOMY.CRIME_SUCCESS_RATE);
        successRate += (isCriminal ? 0.20 : 0);
        if (isHacker) successRate += 0.25;

        const isSuccess = Math.random() < successRate;
        const actions = t('crime.actions', lang);
        const action = actions[Math.floor(Math.random() * actions.length)];

        // Sync memory cooldown for valid attempt
        const timestamps = message.client.cooldowns.get('crime');
        if (timestamps) timestamps.set(message.author.id, Date.now());

        await db.updateUser(message.guild.id, message.author.id, { last_crime: now });

        if (isSuccess) {
            const minReward = await db.getGuildSetting(message.guild.id, 'crime_min', config.ECONOMY.CRIME_MIN_REWARD);
            const maxReward = await db.getGuildSetting(message.guild.id, 'crime_max', config.ECONOMY.CRIME_MAX_REWARD);
            let reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            let rewardData = await calculateReward(reward, message.member, 'income', { category: 'crime' });
            const hackedMsg = handleCrimeJobInteractions(user, lang, rewardData);

            await db.addBalance(message.guild.id, message.author.id, rewardData.total);

            let msg = formatRewardMessage('crime.success', lang, { ...rewardData, action }) + hackedMsg;

            // Update Wanted Status
            const bountyGain = Math.floor(rewardData.total * 0.3);
            const newStars = Math.min(5, (user.wanted_level || 0) + 1);
            const duration = config.WANTED.DURATIONS[newStars] || 3600;
            const expiresAt = now + duration;

            const hadExpired = now > (user.wanted_expires_at || 0);
            const placersQuery = hadExpired ? ", bounty_placers = '[]'" : '';

            await db.execute(
                `UPDATE users SET bounty = bounty + ?, wanted_level = ?, wanted_expires_at = ?${placersQuery} WHERE id = ?`,
                [bountyGain, newStars, expiresAt, message.author.id]
            );
            msg += `\n${t('crime.wanted_alert', lang, { amount: bountyGain.toLocaleString() })}`;

            return message.reply(msg);
        } else {
            let fine = (user.level * 500) + Math.floor((user.balance || 0) * 0.05);
            const xpLoss = 50;

            let escapeMsg = '';
            if (isCriminal && Math.random() < 0.5) {
                fine = Math.floor(fine * 0.2);
                escapeMsg = t('crime.criminal_escaped', lang, { amount: fine.toLocaleString() });
            }

            const xpResult = await deductXp(message.author.id, message.guild.id, xpLoss);
            await db.removeBalance(message.guild.id, message.author.id, fine);

            const jailTime = 600;
            const threshold = config.WANTED.BOUNTY_THRESHOLDS.find(t => fine >= t.min);
            const newStars = threshold ? threshold.stars : 1;

            await db.updateUser(message.guild.id, message.author.id, {
                prison_until: now + jailTime,
                last_crime: now,
                bounty: fine,
                wanted_level: newStars,
                wanted_expires_at: now + jailTime,
                bounty_placers: '[]'
            });

            // Sync memory cooldown for jail time
            if (timestamps) timestamps.set(message.author.id, Date.now());

            const randomPoliceId = await db.getRandomUserByJob('police', [message.client.user.id, message.author.id]);
            const policeUser = randomPoliceId ? message.guild?.members?.cache.get(randomPoliceId) : null;
            if (randomPoliceId) {
                await db.addBalance(message.guild.id, randomPoliceId, fine);
            } else {
                // Removed: await addHouseProfit(message, fine); // Bot fund restriction
            }

            let baseFailMsg = t('crime.failure_xp', lang, {
                amount: fine.toLocaleString(),
                xp: xpResult.deducted.toLocaleString(),
                jail: t('common.jail_time', lang)
            });

            let finalMsg = `❌ `;
            if (escapeMsg) finalMsg += escapeMsg + '\n';
            finalMsg += baseFailMsg;

            if (user.job === 'teacher') {
                const result = await deductLevel(message.author.id, message.guild.id);
                finalMsg += `\n👨‍🏫 **Teacher Penalty:** ${t('crime.teacher_penalty', lang, { level: result.newLevel.toLocaleString() })}`;
            }

            if (randomPoliceId && policeUser && !escapeMsg) {
                finalMsg += `\n${t('job.police_notification', lang, { amount: fine.toLocaleString() }).replace('👮 **Trực ban:** ', '').replace('👮 **On Duty:** ', '')} (<@${randomPoliceId}>)`;
            }

            return message.reply(finalMsg);
        }
    } catch (error) {
        console.error('Error in crime command:', error);
        const { t } = require('../../utils/i18n');
        const lang = await getLanguage(message.author.id, message.guild?.id);
        return message.reply(`❌ ${t('common.error', lang)}`);
    }
    }
};
