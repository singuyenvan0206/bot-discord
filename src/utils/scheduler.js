const db = require('../database');
const bizConfig = require('../config/businesses');

async function initScheduler(client) {
    // Run business passive income check every hour
    setInterval(async () => {
        console.log('🕒 Running hourly schedulers...');
        await processPassiveIncome(client);
        const { processHouseDistribution, processLotteryDraw } = require('./timer');
        await processHouseDistribution(client).catch(console.error);
        await processLotteryDraw(client).catch(console.error);
        await processWantedDecay(client).catch(console.error);
    }, 3600_000); // 1 hour

    // Run random events check every 3 hours
    setInterval(async () => {
        console.log('🎲 Running random business events scheduler...');
        await processRandomEvents(client);
    }, 10800_000); // 3 hours

    // Server Economy Events (Rotate if expired every 15 mins)
    const { getCurrentEvent } = require('./eventSystem');

    // Initial check for all guilds
    try {
        const db = require('../database');
        const guilds = await db.queryAll('SELECT id FROM guilds');
        for (const g of guilds) {
            await getCurrentEvent(g.id, client).catch(() => { });
        }
    } catch (e) {
        console.error('[Scheduler] Failed initial event check:', e);
    }

    setInterval(async () => {
        try {
            const db = require('../database');
            const guilds = await db.queryAll('SELECT id FROM guilds');
            for (const g of guilds) {
                await getCurrentEvent(g.id, client).catch(() => { });
            }
        } catch (e) {
            console.error('[Scheduler] Failed periodic event check:', e);
        }
    }, 900_000); // 15 minutes

    // Aquarium Passive Income (Every hour)
    setInterval(async () => {
        console.log('🐠 Processing Aquarium passive income...');
        await processAquariumIncome(client);
    }, 3600_000);

    // Helper to calculate milliseconds until 7:00 AM GMT+7 (0:00 UTC)
    const getDelayUntil7AM = () => {
        const now = new Date();
        const target = new Date();
        target.setUTCHours(0, 0, 0, 0); // 0:00 UTC is exactly 7:00 AM GMT+7
        if (now.getTime() >= target.getTime()) {
            target.setUTCDate(target.getUTCDate() + 1);
        }
        return target.getTime() - now.getTime();
    };

    // Helper to calculate milliseconds until the next 12-hour suggestion slot (7:00 AM or 7:00 PM GMT+7)
    const getDelayUntilNext12Hours = () => {
        const now = new Date();
        const targetAM = new Date();
        targetAM.setUTCHours(0, 0, 0, 0); // 7:00 AM GMT+7 (0:00 UTC)

        const targetPM = new Date();
        targetPM.setUTCHours(12, 0, 0, 0); // 7:00 PM GMT+7 (12:00 UTC)

        const diffs = [
            targetAM.getTime() - now.getTime(),
            targetPM.getTime() - now.getTime(),
            targetAM.getTime() + 24 * 3600_000 - now.getTime(),
            targetPM.getTime() + 24 * 3600_000 - now.getTime()
        ].filter(diff => diff > 0);

        return Math.min(...diffs);
    };

    // Schedule automated emoji prune maintenance daily at 7:00 AM GMT+7
    const scheduleDailyPrune = () => {
        const delay = getDelayUntil7AM();
        console.log(`[Scheduler] Next automated emoji prune maintenance scheduled in ${Math.round(delay / 1000 / 60)} minutes (at 7:00 AM GMT+7).`);
        setTimeout(async () => {
            console.log('💡 Running automated emoji prune maintenance (7:00 AM GMT+7)...');
            await processAutoPrune(client).catch(console.error);
            scheduleDailyPrune(); // Set up for the next day
        }, delay);
    };

    // Schedule automated emoji/sticker suggestions every 12 hours (at 7:00 AM and 7:00 PM GMT+7)
    const schedule12HourSuggestions = () => {
        const delay = getDelayUntilNext12Hours();
        console.log(`[Scheduler] Next automated emoji/sticker suggestions scheduled in ${Math.round(delay / 1000 / 60)} minutes.`);
        setTimeout(async () => {
            console.log('💡 Running automated 12-hour emoji/sticker suggestions...');
            await processAutoSuggest(client).catch(console.error);
            await processStickerAutoSuggest(client).catch(console.error);
            schedule12HourSuggestions(); // Set up for the next 12 hours
        }, delay);
    };

    scheduleDailyPrune();
    schedule12HourSuggestions();
}

async function processAquariumIncome(client) {
    const { CATCHES } = require('./fishData');
    const users = await db.queryAll("SELECT id, aquarium_data FROM users WHERE aquarium_data != '{}'");

    for (const u of users) {
        let aquarium = {};
        try { aquarium = JSON.parse(u.aquarium_data || '{}'); } catch { continue; }
        if (!aquarium.fish || aquarium.fish.length === 0) continue;

        let totalIncome = 0;
        for (const f of aquarium.fish) {
            const data = CATCHES.find(c => c.key === f.key);
            if (!data) continue;

            const { calculateFishPassiveIncome } = require('./fishData');
            totalIncome += calculateFishPassiveIncome(data.value);
        }

        if (totalIncome > 0) {
            await db.addBalance(null, u.id, totalIncome);
        }
    }
}

async function processPassiveIncome(client) {
    const allBiz = await db.getAllUserBusinesses();
    const now = Math.floor(Date.now() / 1000);

    for (const b of allBiz) {
        const type = bizConfig.TYPES[b.business_id];
        if (!type) continue;

        const levelBonus = 1 + (b.level - 1) * 0.5;
        const staffBonus = 1 + b.staff * bizConfig.STAFF_INCOME_BONUS;
        const hourly = Math.floor(type.base_income * levelBonus * staffBonus);

        const secondsPassed = now - b.last_harvest;
        if (secondsPassed >= 3600) {
            // We don't automatically add to balance here, users harvest with $business collect.
            // But we could notify them or log it.
            // Actually, the prompt says "Nhận một lượng coins nhỏ mỗi giờ (thay vì phải gõ lệnh $work)".
            // This could mean automatic addition or accumulation. 
            // My $business collect logic handles accumulation based on last_harvest.
            // So this scheduler isn't strictly needed for the reward itself, 
            // but it's good for events and notifications.
        }
    }
}

async function processRandomEvents(client) {
    const allBiz = await db.getAllUserBusinesses();

    for (const b of allBiz) {
        const event = bizConfig.RANDOM_EVENTS.find(e => Math.random() < e.chance);
        if (event) {
            console.log(`📢 Event triggered for user ${b.user_id}: ${event.name.en}`);

            if (event.cost_mult) {
                const type = bizConfig.TYPES[b.business_id];
                const loss = Math.floor(type.base_price * event.cost_mult);
                await db.removeBalance(b.user_id, loss);

                // Notify user via DM if possible
                try {
                    const { t, getLanguage } = require('./i18n');
                    const lang = await getLanguage(b.user_id);
                    const user = await client.users.fetch(b.user_id);
                    if (user) {
                        const eventName = event.name[lang] || event.name.en;
                        const bizName = type.name[lang] || type.name.en;
                        user.send(t('business.event_notification', lang, {
                            event: eventName,
                            business: bizName,
                            amount: loss
                        })).catch(() => { });
                    }
                } catch (e) { }
            }
        }
    }
}

async function processWantedDecay(client) {
    const config = require('../config');
    const now = Math.floor(Date.now() / 1000);
    const decayRate = config.WANTED.DECAY_RATE || 0.1;

    // Decay bounty for all users with a bounty
    // Also reduce wanted_level if bounty drops below thresholds
    const users = await db.queryAll('SELECT id, bounty, wanted_level, wanted_expires_at, prison_until FROM users WHERE bounty > 0');

    for (const u of users) {
        let newBounty = Number(u.bounty);
        let newStars = Number(u.wanted_level);

        const expiresAt = Number(u.wanted_expires_at || 0);
        const prisonUntil = Number(u.prison_until || 0);

        if (prisonUntil > now) {
            // Locked in prison! bounty doesn't decay or expire
            continue;
        }

        if (expiresAt > 0 && now > expiresAt) {
            // Bounty expired! Clear completely
            newBounty = 0;
            newStars = 0;
        } else {
            // Periodic decay
            newBounty = Math.max(0, Math.floor(newBounty * (1 - decayRate)));

            // Recalculate stars based on new bounty
            if (newBounty > 0) {
                const threshold = config.WANTED.BOUNTY_THRESHOLDS.find(t => newBounty >= t.min);
                newStars = threshold ? threshold.stars : 1;
            } else {
                newStars = 0;
            }
        }

        // Only update if something changed
        if (newBounty !== Number(u.bounty) || newStars !== Number(u.wanted_level)) {
            const placersQuery = newBounty === 0 ? ", bounty_placers = '[]', wanted_expires_at = 0" : '';
            await db.execute(`UPDATE users SET bounty = ?, wanted_level = ?${placersQuery} WHERE id = ?`, [newBounty, newStars, u.id]);
        }
    }
}

async function getGuildSuggestChannel(guild) {
    const channelId = await db.getGuildSetting(guild.id, 'emoji_suggest_channel');
    if (channelId) {
        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (channel) return channel;
    }
    return guild.channels.cache.find(
        c => c.name.toLowerCase().includes('đề-xuất-emoji') || c.name.toLowerCase().includes('de-xuat-emoji')
    ) || null;
}

async function processAutoPrune(client) {
    console.log('[Scheduler] Running Auto Prune check for all guilds...');
    const guilds = await db.queryAll('SELECT id FROM guilds');
    for (const g of guilds) {
        const autoPruneSetting = await db.getGuildSetting(g.id, 'emoji_auto_prune');
        const autoPrune = autoPruneSetting === true || autoPruneSetting === 'true';
        if (!autoPrune) continue;

        const guild = client.guilds.cache.get(g.id) || await client.guilds.fetch(g.id).catch(() => null);
        if (!guild) continue;

        try {
            const emojis = await guild.emojis.fetch();
            const stats = await db.getEmojiStats(guild.id);
            const statsMap = new Map(stats.map(s => [s.emoji_id, s]));

            const pruneList = [];
            
            const minUsesVal = await db.getGuildSetting(guild.id, 'emoji_prune_min_uses', '5');
            const inactiveDaysVal = await db.getGuildSetting(guild.id, 'emoji_prune_inactive_days', '30');
            const minUses = parseInt(minUsesVal) || 5;
            const inactiveDays = parseInt(inactiveDaysVal) || 30;
            
            const now = Date.now();
            const thresholdMs = inactiveDays * 24 * 60 * 60 * 1000;

            for (const [id, emoji] of emojis) {
                const stat = statsMap.get(id);
                const useCount = stat ? stat.use_count : 0;
                const lastUsed = stat ? Number(stat.last_used_at) : now;

                if (!stat) {
                    // Seed the database with initial tracking stats to prevent instant pruning
                    db.execute(`
                        INSERT INTO emoji_stats (guild_id, emoji_id, use_count, last_used_at)
                        VALUES (?, ?, 0, ?)
                        ON CONFLICT(guild_id, emoji_id) DO NOTHING
                    `, [guild.id, id, now]).catch(() => {});
                }

                const emojiAgeMs = now - emoji.createdTimestamp;
                const trackerAgeMs = now - lastUsed;
                
                let isInactive = false;
                // Only prune if both the emoji itself and its tracking window are older than the inactive days threshold
                if (emojiAgeMs >= thresholdMs && trackerAgeMs >= thresholdMs) {
                    if (useCount <= minUses) {
                        isInactive = true;
                    }
                }

                if (isInactive) {
                    pruneList.push(emoji);
                }
            }

            if (pruneList.length > 0) {
                const names = [];
                for (const emoji of pruneList) {
                    names.push(`\`:${emoji.name}:\``);
                    await emoji.delete().catch(() => {});
                    await db.clearEmojiStats(guild.id, emoji.id).catch(() => {});
                }

                const channel = await getGuildSuggestChannel(guild);
                if (channel) {
                    const { EmbedBuilder } = require('discord.js');
                    const truncate = (arr, limit = 20) => arr.length > limit ? arr.slice(0, limit).join(', ') + `... và ${arr.length - limit} emoji khác` : arr.join(', ');
                    const pruneEmbed = new EmbedBuilder()
                        .setColor(0xED4245) // Discord Red
                        .setTitle('🗑️ Tự Động Dọn Dẹp Emoji')
                        .setDescription(`Hệ thống đã tự động xóa **${pruneList.length}** emoji ít sử dụng (dưới 5 lượt dùng hoặc không dùng trong 30 ngày) để giải phóng dung lượng.`)
                        .addFields({ name: 'Emoji đã xóa', value: truncate(names) });
                    await channel.send({ embeds: [pruneEmbed] }).catch(() => {});
                }
            }
        } catch (err) {
            console.error(`[Scheduler] Auto Prune failed for guild ${g.id}:`, err);
        }
    }
}

function fetchSlackmojisList() {
    try {
        return require('../data/emojigg_meme.json');
    } catch (e) {
        console.error('[Scheduler] Failed to load emoji.gg Meme database:', e);
        return [];
    }
}

async function runAutoSuggestForGuild(guild, slackmojis) {
    if (!slackmojis || slackmojis.length === 0) {
        slackmojis = fetchSlackmojisList();
    }
    if (slackmojis.length === 0) return null;

    const channel = await getGuildSuggestChannel(guild);
    if (!channel) {
        throw new Error('Không tìm thấy kênh đề xuất emoji trong server này.');
    }

    const currentEmojis = await guild.emojis.fetch();
    const currentNames = new Set(currentEmojis.map(e => e.name.toLowerCase()));

    // Lọc bỏ những emoji đã trùng tên trong server
    const candidates = slackmojis.filter(e => !currentNames.has(e.name.toLowerCase()));
    if (candidates.length === 0) {
        throw new Error('Tất cả emoji thịnh hành hiện tại đều đã tồn tại trên server.');
    }

    // Chọn ngẫu nhiên 1 emoji hot
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    
    const approveEmoji = await db.getGuildSetting(guild.id, 'emoji_approve_reaction', '✅');
    const rejectEmoji = await db.getGuildSetting(guild.id, 'emoji_reject_reaction', '❌');

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('💡 Gợi Ý Emoji Tự Động')
        .setDescription(`Mình tìm thấy emoji này rất đẹp trên mạng! Các bạn có muốn thêm nó vào server không?\nBiểu cảm duyệt: ${approveEmoji} | Từ chối: ${rejectEmoji}`)
        .addFields(
            { name: 'Tên Đề Xuất', value: `\`:${target.name}:\``, inline: true },
            { name: 'Nguồn', value: 'Emoji.gg Memes', inline: true }
        )
        .setImage(target.image_url)
        .setFooter({ text: `Source: ${target.image_url} | Name: ${target.name}` });

    const suggestMsg = await channel.send({ embeds: [embed] });
    await suggestMsg.react('👍').catch(() => {});
    await suggestMsg.react('👎').catch(() => {});

    return target;
}

async function processAutoSuggest(client) {
    console.log('[Scheduler] Running Auto Suggest check for all guilds...');
    const slackmojis = await fetchSlackmojisList();
    if (slackmojis.length === 0) return;

    const guilds = await db.queryAll('SELECT id FROM guilds');
    for (const g of guilds) {
        const autoSuggestSetting = await db.getGuildSetting(g.id, 'emoji_auto_suggest');
        const autoSuggest = autoSuggestSetting === true || autoSuggestSetting === 'true';
        if (!autoSuggest) continue;

        const guild = client.guilds.cache.get(g.id) || await client.guilds.fetch(g.id).catch(() => null);
        if (!guild) continue;

        try {
            await runAutoSuggestForGuild(guild, slackmojis);
        } catch (err) {
            console.error(`[Scheduler] Auto Suggest failed for guild ${g.id}:`, err.message);
        }
    }
}

async function runStickerAutoSuggestForGuild(guild, stickers) {
    if (!stickers || stickers.length === 0) {
        try {
            stickers = require('../data/stickers.json');
        } catch (e) {
            console.error('[Scheduler] Failed to load stickers.json:', e);
            return null;
        }
    }
    if (stickers.length === 0) return null;

    const suggestSticker = require('../commands/utility/sticker/suggeststicker');
    const channel = await suggestSticker.getStickerSuggestChannel(guild);
    if (!channel) {
        throw new Error('Không tìm thấy kênh đề xuất sticker trong server này.');
    }

    const currentStickers = await guild.stickers.fetch();
    const currentNames = new Set(currentStickers.map(s => s.name.toLowerCase()));

    // Filter out stickers that already exist on the server
    const candidates = stickers.filter(s => !currentNames.has(s.name.toLowerCase()));
    if (candidates.length === 0) {
        throw new Error('Tất cả sticker thịnh hành hiện tại đều đã tồn tại trên server.');
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    
    await suggestSticker.handleStickerSuggest(
        guild, 
        target.name, 
        target.tags, 
        target.image_url, 
        guild.client.user, 
        channel
    );

    return target;
}

async function processStickerAutoSuggest(client) {
    console.log('[Scheduler] Running Sticker Auto Suggest check for all guilds...');
    let stickers = [];
    try {
        stickers = require('../data/stickers.json');
    } catch (e) {
        console.error('[Scheduler] Failed to load stickers.json:', e);
        return;
    }
    if (stickers.length === 0) return;

    const guilds = await db.queryAll('SELECT id FROM guilds');
    for (const g of guilds) {
        const autoSuggestSetting = await db.getGuildSetting(g.id, 'sticker_auto_suggest');
        const autoSuggest = autoSuggestSetting === true || autoSuggestSetting === 'true';
        if (!autoSuggest) continue;

        const guild = client.guilds.cache.get(g.id) || await client.guilds.fetch(g.id).catch(() => null);
        if (!guild) continue;

        try {
            await runStickerAutoSuggestForGuild(guild, stickers);
        } catch (err) {
            console.error(`[Scheduler] Sticker Auto Suggest failed for guild ${g.id}:`, err.message);
        }
    }
}

module.exports = { 
    initScheduler, 
    processWantedDecay, 
    processAutoPrune, 
    processAutoSuggest, 
    runAutoSuggestForGuild,
    processStickerAutoSuggest,
    runStickerAutoSuggestForGuild
};

