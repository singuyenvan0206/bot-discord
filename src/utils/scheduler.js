const db = require('../database');
const bizConfig = require('../config/businesses');

async function initScheduler(client) {
    // Run business passive income check every hour
    setInterval(async () => {
        console.log('🕒 Running business passive income scheduler...');
        await processPassiveIncome(client);
    }, 3600_000); // 1 hour

    // Run random events check every 3 hours
    setInterval(async () => {
        console.log('🎲 Running random business events scheduler...');
        await processRandomEvents(client);
    }, 10800_000); // 3 hours
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
                    const user = await client.users.fetch(b.user_id);
                    if (user) {
                        user.send(`⚠️ **Business Event:** ${event.name.en} for your ${type.name.en}. You lost **${loss.toLocaleString()}** coins in maintenance/taxes.`).catch(() => { });
                    }
                } catch (e) { }
            }
        }
    }
}

module.exports = { initScheduler };
