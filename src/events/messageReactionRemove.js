const { Events } = require('discord.js');
const db = require('../database');
const { EMOJI, createGiveawayEmbed, createEntryButton } = require('../utils/embeds');
const { getLanguage } = require('../utils/i18n');

module.exports = {
    name: Events.MessageReactionRemove,
    async execute(reaction, user) {
        if (user.bot) return;
        if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
        if (reaction.emoji.name !== EMOJI) return;

        const giveaway = db.getGiveaway(reaction.message.id);
        if (!giveaway || giveaway.ended) return;

        db.removeParticipant(giveaway.id, user.id);
        await updateGiveawayEmbed(reaction.message, giveaway);
    },
};

async function updateGiveawayEmbed(message, giveaway) {
    try {
        const lang = getLanguage(null, giveaway.guild_id);
        const count = db.getParticipantCount(giveaway.id);
        const embed = createGiveawayEmbed(giveaway, count, lang);
        await message.edit({ embeds: [embed], components: [createEntryButton(false, lang)] });
    } catch (err) {
        console.error('[Giveaway] Failed to update embed:', err);
    }
}
