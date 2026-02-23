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
        value = value.replace(new RegExp(`{{${k}}}`, 'g'), v);
    });

    return value;
}

/**
 * Get a translated string (Bilingual: VI & EN).
 * @param {string} key Key in dot notation (e.g., 'common.error')
 * @param {string} lang Primary language (used for fallback logic)
 * @param {object} replace Replacement variables
 * @param {boolean} singleLine If true, joins with ' | ' instead of newline and subtext
 */
function t(key, lang = 'vi', replace = {}, singleLine = false) {
    const valVi = getTranslation(key, 'vi', replace);
    const valEn = getTranslation(key, 'en', replace);

    // If they are the same (e.g. key itself or identical strings), just return one
    if (valVi === valEn) return valVi;

    if (singleLine) {
        return `${valVi} | ${valEn}`;
    }

    // Return combined (Bilingual). Subtext for the second language.
    return `${valVi}\n-# *(${valEn})*`;
}

/**
 * Resolve language for a given context (user/guild)
 */
function getLanguage(userId, guildId = null) {
    // 1. Check User setting (skip if no userId to avoid creating null user)
    if (userId) {
        const user = db.getUser(userId);
        if (user && user.language && user.language !== 'null') return user.language;
    }

    // 2. Check Guild setting
    if (guildId) {
        const guild = db.getGuild(guildId);
        if (guild && guild.language && guild.language !== 'null') return guild.language;
    }

    // 3. Default
    return 'en';
}

module.exports = { t, getLanguage };
