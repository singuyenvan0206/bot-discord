const db = require('../database');
const { t } = require('./i18n');
const { formatDuration } = require('./time');
const config = require('../config');

/**
 * Checks if a user is currently in prison.
 * Returns { inPrison: boolean, timeLeft?: string, msg?: string }
 */
async function checkPrisonGuard(userId, guildId, lang, commandName = null) {
    const user = await db.getUser(userId, guildId);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const prisonUntil = Number(user.prison_until || 0);

    if (prisonUntil > 0 && nowSeconds < prisonUntil) {
        // Check exceptions
        const exceptions = config.PRISON.BLOCK_EXCEPTIONS || [];
        if (commandName && exceptions.includes(commandName)) {
            return { inPrison: false };
        }

        const timeLeft = formatDuration(prisonUntil - nowSeconds, lang);
        return {
            inPrison: true,
            timeLeft,
            msg: t('common.user_in_prison_global', lang, { time: timeLeft })
        };
    }

    return { inPrison: false };
}

/**
 * Checks if a command is on a persistent (database-backed) cooldown.
 * Returns { onCooldown: boolean, timeLeft?: string, msg?: string }
 */
async function checkPersistentCooldown(userId, guildId, lang, commandName) {
    const user = await db.getUser(userId, guildId);
    const now = Math.floor(Date.now() / 1000);

    // Map command names to DB fields and config cooldowns
    const cooldownMap = {
        'daily': { field: 'last_daily', configKey: 'daily_cooldown', defaultVal: config.ECONOMY.DAILY_COOLDOWN, langKey: 'daily.cooldown' },
        'work': { field: 'last_work', configKey: 'work_cooldown', defaultVal: config.ECONOMY.WORK_COOLDOWN, langKey: 'work.cooldown' },
        'crime': { field: 'last_crime', configKey: 'crime_cooldown', defaultVal: config.ECONOMY.CRIME_COOLDOWN, langKey: 'crime.cooldown' },
        'rob': { field: 'last_rob', configKey: 'rob_cooldown', defaultVal: config.ECONOMY.ROB_COOLDOWN, langKey: 'rob.cooldown' },
        'freelance': { field: 'last_freelance', configKey: 'freelance_cooldown', defaultVal: config.ECONOMY.FREELANCE_COOLDOWN, langKey: 'freelance.cooldown' },
        'beg': { field: 'last_beg', configKey: 'beg_cooldown', defaultVal: config.ECONOMY.BEG_COOLDOWN, langKey: 'beg.cooldown' },
        'search': { field: 'last_search', configKey: 'search_cooldown', defaultVal: config.ECONOMY.SEARCH_COOLDOWN, langKey: 'search.cooldown' },
        'arrest': { field: 'last_arrest', configKey: 'arrest_cooldown', defaultVal: config.ECONOMY.ARREST_COOLDOWN, langKey: 'arrest.cooldown' },
        'mentor': { field: 'last_mentor', configKey: 'mentor_cooldown', defaultVal: 14400, langKey: 'mentor.cooldown' },
        'market': { field: 'last_market', configKey: 'market_cooldown', defaultVal: 7200, langKey: 'market.cooldown' },
        'harvest': { field: 'last_harvest', configKey: 'harvest_cooldown', defaultVal: 3600, langKey: 'harvest.cooldown' },
        'hack': { field: 'last_hack', configKey: 'hack_cooldown', defaultVal: 3600, langKey: 'hack.cooldown' }
    };

    const mapping = cooldownMap[commandName];
    if (!mapping) return { onCooldown: false };

    const lastTime = Number(user[mapping.field] || 0);
    const cooldown = await db.getGuildSetting(guildId, mapping.configKey, mapping.defaultVal);

    if (now - lastTime < cooldown) {
        const remaining = cooldown - (now - lastTime);
        const timeLeft = formatDuration(remaining, lang);
        return {
            onCooldown: true,
            timeLeft,
            msg: t(mapping.langKey, lang, { time: timeLeft })
        };
    }

    return { onCooldown: false };
}

module.exports = {
    checkPrisonGuard,
    checkPersistentCooldown
};
