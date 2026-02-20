const db = require('../database');
const { createGiveawayEmbed, createEndedEmbed, createWinnerAnnouncementEmbed, createEntryButton, EMOJI } = require('./embeds');

const CHECK_INTERVAL = 15_000; // 15 seconds
const EMBED_UPDATE_INTERVAL = 60_000; // 1 minute

let timerInterval = null;
let lastEmbedUpdate = 0;

/**
 * Pick random winners from a list of participant user IDs.
 * Supports bonus entries — users with bonus entries get extra "tickets".
 */
function pickWinners(participantsOrIds, count) {
    // If we receive simple string IDs, use old behavior
    if (typeof participantsOrIds[0] === 'string') {
        const shuffled = [...participantsOrIds].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    // If we receive participant objects with bonus_entries
    const pool = [];
    for (const p of participantsOrIds) {
        const userId = p.user_id || p;
        const entries = 1 + (p.bonus_entries || 0);
        for (let i = 0; i < entries; i++) {
            pool.push(userId);
        }
    }

    // Shuffle and pick unique winners
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const winners = [];
    for (const id of shuffled) {
        if (!winners.includes(id)) {
            winners.push(id);
        }
        if (winners.length >= count) break;
    }

    return winners;
}

/**
 * End a giveaway: pick winners, update embed, announce.
 */
async function finishGiveaway(client, giveaway) {
    try {
        const guild = await client.guilds.fetch(giveaway.guild_id).catch(() => null);
        if (!guild) return;

        const channel = await guild.channels.fetch(giveaway.channel_id).catch(() => null);
        if (!channel) return;

        const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
        if (!message) return;

        const participants = db.getParticipants(giveaway.id);
        const participantIds = participants.map(p => p.user_id);
        const winners = pickWinners(participants, giveaway.winner_count);
        const participantCount = participantIds.length;

        // Mark as ended in DB
        db.endGiveaway(giveaway.message_id);

        // Update the giveaway embed (remove buttons)
        const endedEmbed = createEndedEmbed(giveaway, winners, participantCount);
        await message.edit({ embeds: [endedEmbed], components: [] }).catch(() => { });

        // Announce winners in the channel
        if (winners.length > 0) {
            const announcementEmbed = createWinnerAnnouncementEmbed(giveaway, winners);
            await channel.send({
                content: `🎉 ${winners.map(id => `<@${id}>`).join(', ')}`,
                embeds: [announcementEmbed],
            }).catch(() => { });

            // DM each winner
            for (const winnerId of winners) {
                try {
                    const user = await client.users.fetch(winnerId);
                    await user.send({
                        embeds: [
                            createWinnerAnnouncementEmbed(giveaway, [winnerId])
                                .setFooter({ text: `Từ máy chủ: ${guild.name}` })
                        ],
                    });
                } catch {
                    // User has DMs disabled — silently skip
                }
            }
        } else {
            await channel.send({
                content: `😔 Không có người tham gia hợp lệ cho giveaway **${giveaway.prize}** — không thể chọn người thắng.`,
            }).catch(() => { });
        }
    } catch (error) {
        console.error(`[Timer] Error finishing giveaway #${giveaway.id}:`, error);
    }
}

/**
 * Activate scheduled giveaways that are ready to start.
 */
async function activateScheduledGiveaways(client) {
    const now = Math.floor(Date.now() / 1000);
    const activeGiveaways = db.getActiveGiveaways();

    for (const giveaway of activeGiveaways) {
        // Skip giveaways that already have a proper embed (message_id is set and not a scheduled placeholder)
        if (!giveaway.scheduled_start || giveaway.scheduled_start > now) continue;

        try {
            const guild = await client.guilds.fetch(giveaway.guild_id).catch(() => null);
            if (!guild) continue;

            const channel = await guild.channels.fetch(giveaway.channel_id).catch(() => null);
            if (!channel) continue;

            const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
            if (!message) continue;

            // Check if this is still showing a "Coming Soon" embed — update it to active
            const embed = createGiveawayEmbed(giveaway, 0);
            const buttonRow = createEntryButton();
            await message.edit({ embeds: [embed], components: [buttonRow] });
            await message.react(EMOJI).catch(() => { });

            // Clear the scheduled_start so it's not processed again
            db.updateGiveaway(giveaway.message_id, { scheduledStart: null });

            console.log(`[Timer] Activated scheduled giveaway: ${giveaway.prize}`);
        } catch (err) {
            console.error(`[Timer] Error activating scheduled giveaway #${giveaway.id}:`, err);
        }
    }
}

/**
 * Periodically update the countdown text on active giveaway embeds.
 */
async function updateActiveEmbeds(client) {
    const now = Date.now();
    if (now - lastEmbedUpdate < EMBED_UPDATE_INTERVAL) return;
    lastEmbedUpdate = now;

    const activeGiveaways = db.getActiveGiveaways();

    for (const giveaway of activeGiveaways) {
        if (giveaway.paused) continue; // Skip paused giveaways

        try {
            const guild = await client.guilds.fetch(giveaway.guild_id).catch(() => null);
            if (!guild) continue;

            const channel = await guild.channels.fetch(giveaway.channel_id).catch(() => null);
            if (!channel) continue;

            const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
            if (!message) continue;

            const participantCount = db.getParticipantCount(giveaway.id);
            const embed = createGiveawayEmbed(giveaway, participantCount);
            const buttonRow = createEntryButton();
            await message.edit({ embeds: [embed], components: [buttonRow] }).catch(() => { });
        } catch {
            // Silently skip if we can't update
        }
    }
}

/**
 * Main timer loop — checks for expired giveaways, activates scheduled ones, and updates embeds.
 */
async function tick(client) {
    try {
        // 1. Activate scheduled giveaways
        await activateScheduledGiveaways(client);

        // 2. Check for expired giveaways
        const expired = db.getExpiredGiveaways();
        for (const giveaway of expired) {
            await finishGiveaway(client, giveaway);
        }

        // 3. Update active embeds periodically
        await updateActiveEmbeds(client);
    } catch (error) {
        console.error('[Timer] Error in timer tick:', error);
    }
}

/**
 * Start the giveaway timer.
 */
function startTimer(client) {
    if (timerInterval) return;
    console.log('[Timer] Giveaway timer started (checking every 15s)');
    timerInterval = setInterval(() => tick(client), CHECK_INTERVAL);
    // Run immediately on start to catch any giveaways that expired while offline
    tick(client);
}

/**
 * Stop the giveaway timer.
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        console.log('[Timer] Giveaway timer stopped');
    }
}

module.exports = {
    pickWinners,
    finishGiveaway,
    startTimer,
    stopTimer,
};
