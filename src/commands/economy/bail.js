const db = require('../../database');
const config = require('../../config');
const { getLanguage, t } = require('../../utils/i18n');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'bail',
    aliases: ['nop-phat', 'ra-tu'],
    description: 'Pay bail to get out of prison early.',
    execute: async (message, args) => {
        const userId = message.author.id;
        const guildId = message.guild.id;
        const lang = await getLanguage(userId, guildId);

        const user = await db.getUser(userId, guildId);
        const now = Math.floor(Date.now() / 1000);
        const prisonUntil = Number(user.prison_until || 0);

        if (now >= prisonUntil) {
            return message.reply(t('bail.not_in_prison', lang));
        }

        const remainingMinutes = Math.max(1, Math.ceil((prisonUntil - now) / 60));
        const bailCost = remainingMinutes * config.PRISON.BAIL_COST_PER_MINUTE;

        if (args[0] === 'confirm') {
            if (Number(user.balance) < bailCost) {
                return message.reply(t('bail.insufficient_funds', lang, {
                    cost: bailCost.toLocaleString(),
                    balance: Number(user.balance).toLocaleString()
                }));
            }

            await db.execute('UPDATE users SET balance = balance - ?, prison_until = 0 WHERE id = ?', [bailCost, userId]);
            return message.reply(t('bail.success', lang, { cost: bailCost.toLocaleString() }));
        } else {
            return message.reply(t('bail.usage', lang, {
                cost: bailCost.toLocaleString(),
                time: formatDuration(prisonUntil - now, lang),
                prefix: config.PREFIX
            }));
        }
    }
};
