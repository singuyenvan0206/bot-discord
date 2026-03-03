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

    const now = Math.floor(Date.now() / 1000);
    const interval = config.ECONOMY.HOUSE_DISTRIBUTION_INTERVAL;
    const botId = client.user.id;

    const lastDistStr = await db.getGlobalSetting('last_house_distribution', '0');
    const lastDist = parseInt(lastDistStr);

    if (now - lastDist < interval) return;

    const botUser = await db.getGlobalUser(botId);
    const balance = botUser.balance || 0;

    if (balance < config.ECONOMY.HOUSE_DISTRIBUTION_MIN_POOL) return;

    const userCount = await db.getUserCount();
    if (userCount <= 1) return;

    // Exclude bot from distribution; split only among human users.
    const humanCount = Math.max(1, userCount - 1);
    const amountPerUser = Math.floor(balance / humanCount);
    if (amountPerUser <= 0) return;

    // Distribute balance globally
    await db.distributeBalanceRandomly(balance, botId);
    await db.setGlobalSetting('last_house_distribution', now.toString());

    // Announce to all guilds
    for (const guild of client.guilds.cache.values()) {
        const lang = await getLanguage(null, guild.id);
        const guildData = await db.getGuild(guild.id);

        let channel = null;
        if (guildData.dist_channel) {
            channel = guild.channels.cache.get(guildData.dist_channel);
        }

        if (!channel) {
            const botMember = guild.members.me;
            const textChannels = guild.channels.cache.filter(c =>
                c.isTextBased() &&
                c.permissionsFor(botMember)?.has('ViewChannel') &&
                c.permissionsFor(botMember)?.has('SendMessages')
            );

            if (guild.systemChannel && guild.systemChannel.permissionsFor(botMember)?.has('SendMessages')) {
                channel = guild.systemChannel;
            } else {
                channel = textChannels.find(c => c.name.includes('chat') || c.name.includes('general')) || textChannels.first();
            }
        }

        if (channel && channel.send) {
            // ─── Channel Blacklist Check ───
            const guildBlacklistRaw = await db.getGuildSetting(guild.id, 'blacklisted_channels', '[]');
            let guildBlacklist = [];
            try { guildBlacklist = JSON.parse(guildBlacklistRaw); } catch (e) { guildBlacklist = []; }

            if (config.BLACKLISTED_CHANNELS.includes(channel.id) || guildBlacklist.includes(channel.id)) continue;

            const embed = new EmbedBuilder()
                .setTitle(t('economy.distribution_title', lang) || "💰 Quỹ Phúc Lợi Cộng Đồng")
                .setDescription(t('economy.distribution_random_desc', lang, {
                    total: balance.toLocaleString(),
                    count: humanCount,
                    emoji: config.EMOJIS.COIN
                }) || `Bot đã chia ngẫu nhiên **${balance.toLocaleString()}** coins cho **${humanCount}** người dùng may mắn!`)
                .setColor(config.COLORS.SUCCESS)
                .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL({ dynamic: true, size: 256 }) })
                .setTimestamp();

            const checkButton = new ButtonBuilder()
                .setCustomId('check_dist_reward')
                .setLabel(t('economy.check_reward_button', lang) || "Xem phần thưởng")
                .setEmoji('🎁')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(checkButton);

            channel.send({ embeds: [embed], components: [row] }).catch(() => { });
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
};
