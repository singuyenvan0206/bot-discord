const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');
const { addHouseProfit } = require('../../utils/economy');
const { deductXp } = require('../../utils/leveling');

module.exports = {
    name: 'arrest',
    aliases: ['batgiu', 'catch'],
    description: 'Bắt giữ tội phạm (Arrest a wanted criminal)',
    cooldown: config.ECONOMY.ARREST_COOLDOWN,
    async execute(message, args) {

        const cooldown = config.ECONOMY.ARREST_COOLDOWN;
        const lastArrest = Number(user.last_arrest || 0);

        if (now - lastArrest < cooldown) {
            const timeLeft = cooldown - (now - lastArrest);
            return message.reply(t('arrest.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        const target = message.mentions.users.first();
        if (!target || target.id === message.author.id || target.bot) {
            return message.reply(t('arrest.invalid_target', lang));
        }

        const criminal = await db.getUser(target.id, message.guild.id);
        const bounty = Number(criminal.bounty || 0);

        if (bounty <= 0) {
            return message.reply(t('arrest.no_bounty', lang, { user: target.username }));
        }

        const placers = JSON.parse(criminal.bounty_placers || '[]');
        if (placers.includes(message.author.id)) {
            return message.reply(t('arrest.cannot_arrest_own_bounty', lang));
        }

        // Success chance based on level difference and wanted level
        // Base 40% + (Police Level / 20) - (Wanted Level * 0.05)
        let successChance = 0.4 + (user.level * 0.005) - ((criminal.wanted_level || 1) * 0.05);
        successChance = Math.max(0.2, Math.min(0.9, successChance));

        const isSuccess = Math.random() < successChance;

        if (isSuccess) {
            // Reward: 100% if police, 50% if others
            const rewardPercent = user.job === 'police' ? 1.0 : 0.5;
            const reward = Math.floor(bounty * rewardPercent);

            await db.addBalance(message.guild.id, message.author.id, reward);

            // Penalty for Criminal:
            // 1. Balance Fine (10% of their current balance)
            const criminalBalance = Number(criminal.balance || 0);
            const fine = Math.floor(criminalBalance * 0.10);
            if (fine > 0) {
                await db.removeBalance(message.guild.id, target.id, fine);
                await addHouseProfit(message, fine);
            }

            // 2. XP Deduction (200 XP)
            const xpLoss = 200;
            const xpResult = await deductXp(target.id, message.guild.id, xpLoss);

            // 3. Reset Criminal Status
            await db.execute('UPDATE users SET bounty = 0, wanted_level = 0, wanted_expires_at = 0, bounty_placers = ? WHERE id = ?', ["[]", target.id]);

            // 4. Penalty: Prison (Lockdown for 4 hours)
            // Affects: rob, crime, work, daily
            const prisonTime = 3600 * 4; // 4 hours
            const releaseTime = now + prisonTime;

            await db.execute(
                'UPDATE users SET last_rob = ?, last_crime = ?, last_work = ?, last_daily = ?, prison_until = ? WHERE id = ?',
                [releaseTime, releaseTime, releaseTime, releaseTime, releaseTime, target.id]
            );

            const embed = new EmbedBuilder()
                .setTitle(`🚔 ${t('arrest.title_success', lang)}`)
                .setColor(config.COLORS.SUCCESS)
                .setDescription(t('arrest.success_desc', lang, {
                    police: message.author.username,
                    criminal: target.username,
                    amount: reward.toLocaleString(),
                    emoji: config.EMOJIS.COIN
                }))
                .addFields(
                    { name: '⛓️ ' + t('arrest.prison_label', lang), value: t('arrest.prison_time', lang, { time: formatDuration(prisonTime, lang) }), inline: true },
                    { name: '💸 ' + t('arrest.fine_label', lang), value: `-${fine.toLocaleString()} ${config.EMOJIS.COIN}`, inline: true },
                    { name: '📉 ' + t('arrest.xp_loss_label', lang), value: `-${xpResult.deducted.toLocaleString()} XP`, inline: true }
                )
                .setTimestamp();

            await db.updateUser(message.guild.id, message.author.id, { last_arrest: now });

            return message.reply({ embeds: [embed] });
        } else {
            // Failure: Criminal escapes, Police loses some respect (XP)
            const xpLoss = 20;
            await deductXp(message.author.id, message.guild.id, xpLoss);

            await db.updateUser(message.guild.id, message.author.id, { last_arrest: now });

            return message.reply(t('arrest.failed', lang, { user: target.username }));
        }
    }
};
