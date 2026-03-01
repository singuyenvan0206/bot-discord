const fs = require('fs');
const path = require('path');
const db = require('../database');

const locales = {};
const localesPath = path.join(__dirname, '..', 'locales');

// Load all locale files
const files = fs.readdirSync(localesPath).filter(f => f.endsWith('.json'));
for (const file of files) {
    const lang = file.split('.')[0];
    locales[lang] = require(path.join(localesPath, file));
}

/**
 * Internal helper to get a single translation.
 */
function getTranslation(key, lang, replace = {}) {
    const parts = key.split('.');
    let value = locales[lang] || locales['vi'];

    for (const part of parts) {
        if (!value || value[part] === undefined) {
            // Fallback to Vietnamese if key is missing
            let fallback = locales['vi'];
            for (const fPart of parts) {
                if (!fallback || fallback[fPart] === undefined) return key;
                fallback = fallback[fPart];
            }
            value = fallback;
            break;
        }
        value = value[part];
    }

    if (typeof value !== 'string') return value;

    // Handle replacements {{var}}
    Object.entries(replace).forEach(([k, v]) => {
        const valueToReplace = (typeof v === 'number') ? v.toLocaleString() : v;
        value = value.replace(new RegExp(`{{${k}}}`, 'g'), valueToReplace);
    });

    return value;
}

/**
 * Get a translated string.
 * @param {string} key Key in dot notation (e.g., 'common.error')
 * @param {string} lang Language code ('en', 'vi')
 * @param {object} replace Replacement variables
 */
function t(key, lang = 'vi', replace = {}) {
    return getTranslation(key, lang, replace);
}

/**
 * Resolve language for a given context (user/guild)
 */
async function getLanguage(userId, guildId = null) {
    // 1. Check User setting (skip if no userId to avoid creating null user)
    if (userId) {
        const user = await db.getUser(userId);
        if (user && user.language && user.language !== 'null') return user.language;
    }

    // 2. Check Guild setting
    if (guildId) {
        const guild = await db.getGuild(guildId);
        if (guild && guild.language && guild.language !== 'null') return guild.language;
    }

    // 3. Default
    return 'en';
}

module.exports = { t, getLanguage };
