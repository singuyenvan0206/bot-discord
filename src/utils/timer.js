const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database');
const { createGiveawayEmbed, createEndedEmbed, createWinnerAnnouncementEmbed, createEntryButton, EMOJI } = require('./embeds');
const { getLanguage, t } = require('./i18n');
const config = require('../config');

const CHECK_INTERVAL = 15_000; // 15 seconds
const EMBED_UPDATE_INTERVAL = 60_000; // 1 minute

let timerInterval = null;
let lastEmbedUpdate = 0;

/**
 * Pick random winners from a list of participant user IDs.
 * Supports bonus entries — users with bonus entries get extra "tickets".
 */
function pickWinners(participantsOrIds, count) {
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

        // ─── Channel Blacklist Check ───
        const guildBlacklistRaw = await db.getGuildSetting(guild.id, 'blacklisted_channels', '[]');
        let guildBlacklist = [];
        try { guildBlacklist = JSON.parse(guildBlacklistRaw); } catch (e) { guildBlacklist = []; }

        const isBlacklisted = config.BLACKLISTED_CHANNELS.includes(channel.id) || guildBlacklist.includes(channel.id);
        if (isBlacklisted) return;

        const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
        if (!message) return;

        const participants = await db.getParticipants(giveaway.id);
        const participantIds = participants.map(p => p.user_id);
        const winners = pickWinners(participants, giveaway.winner_count);
        const participantCount = participantIds.length;

        const lang = await getLanguage(null, giveaway.guild_id);

        // Mark as ended in DB
        await db.endGiveaway(giveaway.message_id);

        // Update the giveaway embed (remove buttons)
        const endedEmbed = createEndedEmbed(giveaway, winners, participantCount, lang);
        await message.edit({ embeds: [endedEmbed], components: [] }).catch(() => { });

        // Announce winners in the channel
        if (winners.length > 0) {
            const announcementEmbed = createWinnerAnnouncementEmbed(giveaway, winners, lang);
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
                            createWinnerAnnouncementEmbed(giveaway, [winnerId], lang)
                                .setFooter({ text: `${lang === 'vi' ? 'Từ máy chủ' : 'From server'}: ${guild.name}` })
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
    const activeGiveaways = await db.getActiveGiveaways();

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

            const lang = await getLanguage(null, giveaway.guild_id);
            // Check if this is still showing a "Coming Soon" embed — update it to active
            const embed = createGiveawayEmbed(giveaway, 0, lang);
            const buttonRow = createEntryButton(false, lang);
            await message.edit({ embeds: [embed], components: [buttonRow] });
            await message.react(EMOJI).catch(() => { });

            // Clear the scheduled_start so it's not processed again
            await db.updateGiveaway(giveaway.message_id, { scheduledStart: null });

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

    const activeGiveaways = await db.getActiveGiveaways();

    for (const giveaway of activeGiveaways) {
        if (giveaway.paused) continue; // Skip paused giveaways

        try {
            const guild = await client.guilds.fetch(giveaway.guild_id).catch(() => null);
            if (!guild) continue;

            const channel = await guild.channels.fetch(giveaway.channel_id).catch(() => null);
            if (!channel) continue;

            const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
            if (!message) continue;

            const lang = await getLanguage(null, giveaway.guild_id);
            const participantCount = await db.getParticipantCount(giveaway.id);
            const embed = createGiveawayEmbed(giveaway, participantCount, lang);
            const buttonRow = createEntryButton(false, lang);
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
        const expired = await db.getExpiredGiveaways();
        for (const giveaway of expired) {
            await finishGiveaway(client, giveaway);
        }

        // 3. Update active embeds periodically
        await updateActiveEmbeds(client);

        // 4. House Profit Distribution
        await processHouseDistribution(client);

        // 5. Lottery Draw
        await processLotteryDraw(client);
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
/**
 * Distribute bot's profits back to all users.
 */
async function processHouseDistribution(client) {
    const config = require('../config');
    const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
    const { t, getLanguage } = require('./i18n');

    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const targetHours = [0, 6, 12, 18];
    const nowTimestamp = Math.floor(Date.now() / 1000);

    const dateStr = currentTime.toISOString().split('T')[0];
    const windowKey = `${dateStr}-${currentHour}`;
    const botId = client.user.id;

    for (const guild of client.guilds.cache.values()) {
        try {
            const guildId = guild.id;
            const lang = await getLanguage(null, guildId);
            const guildData = await db.getGuild(guildId);
            const botMember = guild.members.me;

            // ─── Cleanup Expired Distributions ───
            const activeDistRaw = await db.getGuildSetting(guildId, 'active_house_dist', null);
            if (activeDistRaw) {
                let distData;
                try { distData = JSON.parse(activeDistRaw); } catch (e) { distData = null; }

                if (distData && nowTimestamp > distData.endsAt) {
                    console.log(`[Timer] Cleaning up expired distribution for guild ${guildId}`);
                    
                    // Final update of the message
                    if (distData.channelId && distData.messageId) {
                        const channel = guild.channels.cache.get(distData.channelId);
                        if (channel) {
                            const message = await channel.messages.fetch(distData.messageId).catch(() => null);
                            if (message) {
                                const claimedAmount = distData.pool - distData.remaining;
                                const embed = new EmbedBuilder()
                                    .setTitle(t('economy.dist_ended_title', lang) || "🛑 Quỹ Phúc Lợi Đã Đóng")
                                    .setDescription(t('economy.dist_ended_desc', lang, {
                                        claimed: claimedAmount.toLocaleString(),
                                        count: distData.claimed.length,
                                        emoji: config.EMOJIS.COIN
                                    }) || `Đợt chia thưởng đã kết thúc. Tổng cộng đã phát **${claimedAmount.toLocaleString()}** coins cho **${distData.claimed.length}** người may mắn! ❤️`)
                                    .setColor(config.COLORS.ERROR)
                                    .setTimestamp();
                                await message.edit({ embeds: [embed], components: [] }).catch(() => { });
                            }
                        }
                    }
                    await db.setGuildSetting(guildId, 'active_house_dist', null);
                    // Don't continue, we might trigger a new one if it's a target hour
                } else if (distData) {
                    // Distribution is active, update status on embed if it's been a while (or every tick)
                    // We'll update the interaction handler directly for more responsiveness, but here's a fallback
                    continue; // Skip triggering a new one if one is active
                }
            }

            const lastDistKey = await db.getGuildSetting(guildId, 'last_house_distribution_window', '');
            const lastDistTime = parseInt(await db.getGuildSetting(guildId, 'last_house_distribution', '0'));

            // Check if we should distribute:
            const isTargetHour = targetHours.includes(currentHour) && lastDistKey !== windowKey;
            const isOverdue = (nowTimestamp - lastDistTime) > 23400; // 6.5 hours in seconds

            if (!isTargetHour && !isOverdue) continue;

            const balance = await db.getGuildSetting(guildId, 'bot_balance', 0);
            if (balance < config.ECONOMY.HOUSE_DISTRIBUTION_MIN_POOL) {
                if (isTargetHour && balance > 0) {
                    console.log(`[Timer] Skipping distribution for guild ${guildId}: Balance ${balance} < ${config.ECONOMY.HOUSE_DISTRIBUTION_MIN_POOL}`);
                }
                continue;
            }

            console.log(`[Timer] Starting interactive house distribution for guild ${guildId}: Amount ${balance}`);

            // ─── Find Channel ───
            let channel = null;
            if (guildData.dist_channel) channel = guild.channels.cache.get(guildData.dist_channel);

            if (!channel) {
                const textChannels = guild.channels.cache.filter(c =>
                    c.isTextBased() &&
                    c.permissionsFor(botMember)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])
                );

                if (guild.systemChannel && guild.systemChannel.permissionsFor(botMember)?.has(['SendMessages', 'EmbedLinks'])) {
                    channel = guild.systemChannel;
                } else {
                    channel = textChannels.find(c => c.name.includes('bot') || c.name.includes('chat') || c.name.includes('general')) || textChannels.first();
                }
            }

            if (!channel) {
                console.log(`[Timer] No suitable channel found for distribution in guild ${guildId}.`);
                continue;
            }

            // ─── Channel Blacklist Check ───
            const guildBlacklistRaw = await db.getGuildSetting(guildId, 'blacklisted_channels', '[]');
            let guildBlacklist = [];
            try { guildBlacklist = JSON.parse(guildBlacklistRaw); } catch (e) { guildBlacklist = []; }
            if (config.BLACKLISTED_CHANNELS.includes(channel.id) || guildBlacklist.includes(channel.id)) continue;

            // ─── Prepare Distribution Event ───
            const startRoleId = await db.getGuildSetting(guildId, 'start_role', null);
            const endsAt = nowTimestamp + 1800; // 30 minutes in seconds

            const embed = new EmbedBuilder()
                .setTitle(t('economy.distribution_title', lang) || "💰 Quỹ Phúc Lợi Cộng Đồng")
                .setDescription(t('economy.distribution_random_desc', lang, {
                    total: balance.toLocaleString(),
                    emoji: config.EMOJIS.COIN
                }) || `Bot đã mở quỹ **${balance.toLocaleString()}** coins! Hãy nhấn nút bên dưới để nhận phần thưởng ngẫu nhiên.`)
                .addFields({ 
                    name: t('economy.dist_status', lang, { remaining: balance.toLocaleString(), total: balance.toLocaleString(), emoji: config.EMOJIS.COIN }), 
                    value: `⌛ ${t('common.next_expiry', lang, { time: t('common.duration_minutes', lang, { minutes: 30 }) })}` 
                })
                .setColor(config.COLORS.SUCCESS)
                .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL({ dynamic: true, size: 256 }) })
                .setTimestamp();

            const claimButton = new ButtonBuilder()
                .setCustomId('claim_house_dist')
                .setLabel(t('economy.dist_claim_button', lang) || "💰 Nhận thưởng ngay!")
                .setEmoji('🎁')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(claimButton);

            let pingMsg = null;
            if (startRoleId) {
                pingMsg = t('economy.dist_ping_msg', lang, { role: `<@&${startRoleId}>` });
                // Robust fallback if translation is missing or returns the key itself
                if (!pingMsg || pingMsg === 'economy.dist_ping_msg') {
                    pingMsg = `🔔 <@&${startRoleId}> ơi! Quỹ Phúc Lợi Cộng Đồng đã mở, hãy nhanh tay nhận thưởng nào! 💰`;
                }
            }

            const sentMessage = await channel.send({ 
                content: pingMsg, 
                embeds: [embed], 
                components: [row],
                allowedMentions: { roles: startRoleId ? [startRoleId] : [] }
            }).catch(err => {
                console.error(`[Timer] Failed to send distribution message in guild ${guildId}:`, err);
                return null;
            });

            if (sentMessage) {
                const distData = {
                    pool: balance,
                    remaining: balance,
                    endsAt: endsAt,
                    claimed: [],
                    channelId: channel.id,
                    messageId: sentMessage.id,
                    roleId: startRoleId
                };

                await db.setGuildSetting(guildId, 'active_house_dist', JSON.stringify(distData));
                await db.setGuildSetting(guildId, 'bot_balance', 0); // Money is now in the pool
                await db.setGuildSetting(guildId, 'last_house_distribution_window', windowKey);
                await db.setGuildSetting(guildId, 'last_house_distribution', nowTimestamp.toString());
            }

        } catch (err) {
            console.error(`[Timer] Error in per-guild distribution for ${guild.id}:`, err);
        }
    }
}

/**
 * Periodically check and draw the lottery.
 */
async function processLotteryDraw(client) {
    const config = require('../config');
    const now = Math.floor(Date.now() / 1000);
    const interval = config.ECONOMY.LOTTERY.DRAW_INTERVAL;

    for (const guild of client.guilds.cache.values()) {
        const lastDraw = parseInt(await db.getGuildSetting(guild.id, 'last_lottery_draw', '0'));

        if (now - lastDraw < interval) continue;

        const tickets = await db.getLotteryTickets(guild.id);
        if (tickets.length === 0) {
            // No tickets sold, just update last draw time
            await db.setGuildSetting(guild.id, 'last_lottery_draw', now.toString());
            continue;
        }

        // Build the ticket pool
        const pool = [];
        for (const ticket of tickets) {
            for (let i = 0; i < ticket.count; i++) {
                pool.push(ticket.user_id);
            }
        }

        // Pick a winner
        const winnerId = pool[Math.floor(Math.random() * pool.length)];
        const jackpot = await db.getLotteryJackpot(guild.id);

        // Award jackpot
        await db.addBalance(guild.id, winnerId, jackpot);
        await db.setGuildSetting(guild.id, 'last_lottery_draw', now.toString());
        await db.setLotteryJackpot(guild.id, config.ECONOMY.LOTTERY.INITIAL_JACKPOT);
        await db.clearLotteryTickets(guild.id);

        // Announce the winner
        const lang = await getLanguage(null, guild.id);
        const guildData = await db.getGuild(guild.id);

        let channel = null;
        if (guildData.dist_channel) {
            channel = guild.channels.cache.get(guildData.dist_channel);
        }

        if (!channel) {
            channel = guild.systemChannel ||
                guild.channels.cache.find(c => c.name.includes('lottery') || c.name.includes('economy') || c.name.includes('general')) ||
                guild.channels.cache.filter(c => c.isTextBased()).first();
        }

        if (channel && channel.send) {
            // ─── Channel Blacklist Check ───
            const guildBlacklistRaw = await db.getGuildSetting(guild.id, 'blacklisted_channels', '[]');
            let guildBlacklist = [];
            try { guildBlacklist = JSON.parse(guildBlacklistRaw); } catch (e) { guildBlacklist = []; }

            if (config.BLACKLISTED_CHANNELS.includes(channel.id) || guildBlacklist.includes(channel.id)) continue;

            const winner = await client.users.fetch(winnerId).catch(() => ({ username: 'Unknown' }));
            const embed = new EmbedBuilder()
                .setTitle(t('lottery.draw_title', lang) || "🎉 Kết Quả Xổ Số Hôm Nay!")
                .setDescription(t('lottery.draw_desc', lang, {
                    user: winner.username,
                    amount: jackpot.toLocaleString(),
                    emoji: config.EMOJIS.COIN
                }) || `Chúc mừng **${winner.username}** đã trúng giải Jackpot trị giá **${jackpot.toLocaleString()}** coins! 💰`)
                .setColor(config.COLORS.SUCCESS)
                .setThumbnail(winner.displayAvatarURL ? winner.displayAvatarURL({ dynamic: true, size: 256 }) : null)
                .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL({ dynamic: true, size: 256 }) })
                .setTimestamp();

            channel.send({ content: `🎉 Chúc mừng <@${winnerId}>!`, embeds: [embed] }).catch(() => { });
        }
    }
}

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
    processHouseDistribution,
    processLotteryDraw,
};
