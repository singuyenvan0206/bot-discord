const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS } = require('../config');
const { t } = require('./i18n');

/**
 * Formats a currency amount with emoji and locale string.
 */
function formatCurrency(amount, emoji = EMOJIS.COIN) {
    return `**${Number(amount).toLocaleString()}** ${emoji}`;
}

/**
 * Formats a reward message including bonus details.
 */
function formatRewardMessage(mainKey, lang, { total, bonus, percent, emoji = EMOJIS.COIN }) {
    let msg = t(mainKey, lang, { amount: total.toLocaleString(), emoji });

    if (bonus > 0) {
        msg += `\n✨ **Bonus:** +${percent}% (${bonus.toLocaleString()} ${emoji})`;
    }

    return msg;
}

/**
 * Creates a standardized result embed (Success/Info/Error).
 */
function createResultEmbed(lang, { title, description, color, type = 'info' }) {
    const embed = new EmbedBuilder()
        .setTimestamp();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);

    // Set default color based on type
    if (color) {
        embed.setColor(color);
    } else {
        switch (type) {
            case 'success': embed.setColor(COLORS.SUCCESS || '#00FF00'); break;
            case 'error': embed.setColor(COLORS.ERROR || '#FF0000'); break;
            case 'gamble_win': embed.setColor(COLORS.GAMBLE_WIN || '#00FF00'); break;
            case 'gamble_loss': embed.setColor(COLORS.GAMBLE_LOSS || '#FF0000'); break;
            default: embed.setColor(COLORS.INFO || '#0099FF');
        }
    }

    return embed;
}

module.exports = {
    formatCurrency,
    formatRewardMessage,
    createResultEmbed
};
