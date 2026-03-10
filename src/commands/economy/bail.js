const db = require('../../database');
const config = require('../../config');
const { getLanguage, t } = require('../../utils/i18n');
const { formatDuration } = require('../../utils/time');
const { resetCooldowns } = require('../../utils/cooldown');

module.exports = {
    name: 'bail',
    aliases: ['nop-phat', 'ra-tu'],
    description: 'Pay bail to get out of prison early.',
    execute: async (message, args) => {
        const payerId = message.author.id;
        const guildId = message.guild.id;
        const lang = await getLanguage(payerId, guildId);

        // Get target (Prisoner)
        const target = message.mentions.users.first();

        if (!target) {
            // If sender is in prison, show their own bail cost but with "need friend" message
            const user = await db.getUser(payerId, guildId);
            const now = Math.floor(Date.now() / 1000);
            const prisonUntil = Number(user.prison_until || 0);

            if (now < prisonUntil) {
                const remainingMinutes = Math.max(1, Math.ceil((prisonUntil - now) / 60));
                const timeCost = remainingMinutes * config.PRISON.BAIL_COST_PER_MINUTE;
                const bountyCost = Math.floor(Number(user.bounty || 0) * config.PRISON.BAIL_BOUNTY_PERCENT);
                let bailCost = timeCost + bountyCost;

                const stars = Number(user.wanted_level || 0);
                if (stars >= 5) {
                    bailCost *= 2;
                }

                return message.reply(`⚠️ **${t('bail.self_bail_denied', lang)}**\n\n${t('bail.usage_detailed', lang, {
                    user: message.author.username,
                    total: bailCost.toLocaleString(),
                    time_cost: timeCost.toLocaleString(),
                    bounty_cost: bountyCost.toLocaleString(),
                    time: formatDuration(prisonUntil - now, lang),
                    prefix: config.PREFIX
                })}`);
            }

            return message.reply(t('bail.usage', lang, { prefix: config.PREFIX }));
        }

        const prisonerId = target.id;
        if (prisonerId === payerId) {
            return message.reply(t('bail.self_bail_denied', lang));
        }

        const targetData = await db.getUser(prisonerId, guildId);
        const now = Math.floor(Date.now() / 1000);
        const prisonUntil = Number(targetData.prison_until || 0);

        if (now >= prisonUntil) {
            return message.reply(t('bail.not_in_prison', lang));
        }

        const stars = Number(targetData.wanted_level || 0);
        if (stars > config.PRISON.MAX_BAIL_STARS && config.PRISON.MAX_BAIL_STARS > 0) {
            return message.reply(t('bail.most_wanted_denial', lang));
        }

        const remainingMinutes = Math.max(1, Math.ceil((prisonUntil - now) / 60));
        const timeCost = remainingMinutes * config.PRISON.BAIL_COST_PER_MINUTE;
        const bountyCost = Math.floor(Number(targetData.bounty || 0) * config.PRISON.BAIL_BOUNTY_PERCENT);
        let bailCost = timeCost + bountyCost;

        if (stars >= 5) {
            bailCost *= 2;
        }

        if (args.includes('confirm')) {
            const payerData = await db.getUser(payerId, guildId);
            if (Number(payerData.balance) < bailCost) {
                return message.reply(t('bail.insufficient_funds', lang, {
                    cost: bailCost.toLocaleString(),
                    balance: Number(payerData.balance).toLocaleString()
                }));
            }

            // Deduct balance from payer, release prisoner, and sync cooldowns
            await db.execute('UPDATE users SET balance = balance - ? WHERE id = ?', [bailCost, payerId]);
            await db.execute(
                `UPDATE users SET 
                prison_until = 0, 
                spam_violations = 0, 
                bounty = 0, 
                wanted_level = 0, 
                wanted_expires_at = 0, 
                bounty_placers = '[]',
                last_rob = ?, 
                last_crime = ?, 
                last_work = ?, 
                last_daily = ?
                WHERE id = ?`,
                [now, now, now, now, prisonerId]
            );

            // Reset internal cooldowns and spam tracking for the prisoner
            resetCooldowns(message.client, prisonerId);

            // Attempt to remove Discord timeout for the prisoner
            try {
                if (message.guild.members.me.permissions.has('ModerateMembers')) {
                    const member = await message.guild.members.fetch(prisonerId);
                    if (member.communicationDisabledUntilTimestamp) {
                        await member.timeout(null, `Bailed out by ${message.author.tag}.`);
                    }
                }
            } catch (timeoutErr) {
                console.warn('[Bail] Failed to remove Discord timeout:', timeoutErr.message);
            }

            return message.reply(t('bail.success', lang, {
                payer: message.author.username,
                prisoner: target.username,
                cost: bailCost.toLocaleString()
            }));
        } else {
            return message.reply(t('bail.usage_detailed', lang, {
                user: target.username,
                total: bailCost.toLocaleString(),
                time_cost: timeCost.toLocaleString(),
                bounty_cost: bountyCost.toLocaleString(),
                time: formatDuration(prisonUntil - now, lang),
                prefix: config.PREFIX
            }));
        }
    }
};
