const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'arrest',
    aliases: ['batgiu', 'catch'],
    description: 'Bắt giữ tội phạm (Arrest a wanted criminal) - Police Only',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);

        if (user.job !== 'police') {
            return message.reply(t('arrest.police_only', lang));
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

        // Success chance based on level difference and wanted level
        // Base 40% + (Police Level / 20) - (Wanted Level * 0.05)
        let successChance = 0.4 + (user.level * 0.005) - ((criminal.wanted_level || 1) * 0.05);
        successChance = Math.max(0.2, Math.min(0.9, successChance));

        const isSuccess = Math.random() < successChance;

        if (isSuccess) {
            // Reward: Bounty from "Government Fund"
            await db.addBalance(message.guild.id, message.author.id, bounty);

            // Reset Criminal
            await db.execute('UPDATE users SET bounty = 0, wanted_level = 0 WHERE id = ?', [target.id]);

            // Penalty: Prison (increases rob/crime cooldown by setting last_rob/last_crime to future)
            const prisonTime = 3600 * 2; // 2 hours
            const now = Math.floor(Date.now() / 1000);
            await db.execute('UPDATE users SET last_rob = ?, last_crime = ? WHERE id = ?', [now + prisonTime, now + prisonTime, target.id]);

            const embed = new EmbedBuilder()
                .setTitle(`🚔 ${t('arrest.title_success', lang)}`)
                .setColor(config.COLORS.SUCCESS)
                .setDescription(t('arrest.success_desc', lang, {
                    police: message.author.username,
                    criminal: target.username,
                    amount: bounty.toLocaleString(),
                    emoji: config.EMOJIS.COIN
                }))
                .addFields({ name: '⛓️ ' + t('arrest.prison_label', lang), value: t('arrest.prison_time', lang, { time: formatDuration(prisonTime, lang) }) })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        } else {
            // Failure: Criminal escapes, Police loses some respect (XP)
            const xpLoss = 20;
            const { deductXp } = require('../../utils/leveling');
            await deductXp(message.author.id, message.guild.id, xpLoss);

            return message.reply(t('arrest.failed', lang, { user: target.username }));
        }
    }
};
