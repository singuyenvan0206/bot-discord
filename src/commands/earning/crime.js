const db = require('../../database');
const { deductLevel, deductXp } = require('../../utils/leveling');
const { calculateReward, hasActiveItem, removeActiveBuff } = require('../../utils/multiplier');
const { addHouseProfit } = require('../../utils/economy');
const { t, getLanguage } = require('../../utils/i18n');
const { formatDuration } = require('../../utils/time');
const config = require('../../config');

module.exports = {
    name: 'crime',
    aliases: ['cr'],
    description: 'Thực hiện các phi vụ bất hợp pháp (Commit illegal heists for fast cash)',
    cooldown: config.ECONOMY.CRIME_COOLDOWN,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);

        const cooldown = await db.getGuildSetting(message.guild.id, 'crime_cooldown', config.ECONOMY.CRIME_COOLDOWN);
        const lastCrime = Number(user.last_crime || 0);

        if (now - lastCrime < cooldown) {
            const timeLeft = cooldown - (now - lastCrime);
            return message.reply(t('crime.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const isCriminal = user.job === 'criminal';
        const isHacker = user.job === 'hacker';
        let successRate = await db.getGuildSetting(message.guild.id, 'crime_rate', config.ECONOMY.CRIME_SUCCESS_RATE);
        successRate += (isCriminal ? 0.1 : 0); // Base criminal bonus

        // Hacker Synergy: +15% success rate bonus
        if (isHacker) successRate += 0.15;

        const isSuccess = Math.random() < successRate;
        const actions = t('crime.actions', lang);
        const action = actions[Math.floor(Math.random() * actions.length)];

        // Valid attempt - Set Cooldowns
        const timestamps = message.client.cooldowns.get('crime');
        const cooldownAmount = (this.cooldown || config.ECONOMY.CRIME_COOLDOWN) * 1000;
        timestamps.set(message.author.id, now * 1000); // Set start time to now
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        await db.updateUser(message.guild.id, message.author.id, { last_crime: now });

        if (isSuccess) {
            const minReward = await db.getGuildSetting(message.guild.id, 'crime_min', config.ECONOMY.CRIME_MIN_REWARD);
            const maxReward = await db.getGuildSetting(message.guild.id, 'crime_max', config.ECONOMY.CRIME_MAX_REWARD);
            let reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

            // Hacker Interaction: 20% chance to double reward
            let hackedMsg = '';
            if (isHacker && Math.random() < 0.2) {
                reward *= 2;
                hackedMsg = t('crime.hacker_hacked', lang);
            }

            const { total, bonus, percent } = await calculateReward(reward, message.member, 'income', { category: 'crime' });

            await db.addBalance(message.guild.id, message.author.id, total);

            let msg = t('crime.success', lang, {
                action,
                amount: total.toLocaleString(),
                emoji: config.EMOJIS.COIN
            });

            if (bonus > 0) {
                msg += t('common.bonus_capped', lang, { amount: bonus.toLocaleString(), percent });
            }

            if (hackedMsg) msg += hackedMsg;

            // Update Wanted Status
            const bountyGain = Math.floor(total * 0.3);
            await db.execute('UPDATE users SET bounty = bounty + ?, wanted_level = LEAST(5, wanted_level + 1) WHERE id = ?', [bountyGain, message.author.id]);
            msg += `\n🚨 **Wanted Status:** +\`${bountyGain.toLocaleString()}\` bounty!`;

            return message.reply(msg);
        } else {
            // New Scaled Penalty: (level * 500) + (5% of balance)
            let fine = (user.level * 500) + Math.floor((user.balance || 0) * 0.05);
            const xpLoss = 50;

            // Criminal Interaction: 50% escape chance — reduces fine by 80%
            let escapeMsg = '';
            if (isCriminal && Math.random() < 0.5) {
                fine = Math.floor(fine * 0.2);
                escapeMsg = t('crime.criminal_escaped', lang, { amount: fine.toLocaleString() });
            }

            // XP Penalty & Fine
            const xpResult = await deductXp(message.author.id, message.guild.id, xpLoss);
            await db.removeBalance(message.guild.id, message.author.id, fine);

            // Cooldown Penalty: Jail Time (2x cooldown for next time)
            const jailCooldown = config.ECONOMY.CRIME_COOLDOWN;
            await db.updateUser(message.guild.id, message.author.id, { last_crime: now + jailCooldown });

            // Update memory cooldown to match jail time
            if (timestamps) {
                timestamps.set(message.author.id, (now + jailCooldown) * 1000);
                setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
            }

            // Transfer fine to a random Police in the guild
            const excludeIds = [message.client.user.id];
            if (user.job === 'police') excludeIds.push(message.author.id);

            const randomPoliceId = await db.getRandomUserByJob('police', excludeIds);
            const policeUser = randomPoliceId ? message.guild?.members?.cache.get(randomPoliceId) : null;
            if (randomPoliceId) {
                await db.addBalance(message.guild.id, randomPoliceId, fine);
            } else {
                await addHouseProfit(message, fine);
            }

            // Base failure message
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
    }
};
