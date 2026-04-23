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

module.exports = { initScheduler, processWantedDecay };
