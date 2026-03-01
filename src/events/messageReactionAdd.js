const { Events } = require('discord.js');
const db = require('../database');
const { EMOJI, createGiveawayEmbed, createEntryButton } = require('../utils/embeds');
const { getLanguage } = require('../utils/i18n');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (user.bot) return;

        if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
        if (reaction.message.partial) { try { await reaction.message.fetch(); } catch { return; } }

        if (reaction.emoji.name !== EMOJI) return;

        const giveaway = await db.getGiveaway(reaction.message.id);
        if (!giveaway || giveaway.ended) return;

        if (giveaway.paused) {
            await reaction.users.remove(user.id).catch(() => { });
            return;
        }

        if (giveaway.required_role_id) {
            try {
                const guild = reaction.message.guild;
                const member = await guild.members.fetch(user.id);
                if (!member.roles.cache.has(giveaway.required_role_id)) {
                    await reaction.users.remove(user.id).catch(() => { });
                    return;
                }
            } catch { return; }
        }

        await db.addParticipant(giveaway.id, user.id);
        await updateGiveawayEmbed(reaction.message, giveaway);
    },
};

async function updateGiveawayEmbed(message, giveaway) {
    try {
        const lang = await getLanguage(null, giveaway.guild_id);
        const count = await db.getParticipantCount(giveaway.id);
        const embed = createGiveawayEmbed(giveaway, count, lang);
        await message.edit({ embeds: [embed], components: [createEntryButton(false, lang)] });
    } catch (err) {
        console.error('[Giveaway] Failed to update embed:', err);
    }
}
