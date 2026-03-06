const db = require('../database');

const EVENTS = {
    'none': {
        id: 'none',
        icon: '🌐',
        color: 0x95A5A6
    },
    'market_boom': {
        id: 'market_boom',
        icon: '🚀',
        color: 0x2ECC71,
        incomeBuff: 0.25, // +25% total income
    },
    'fishing_season': {
        id: 'fishing_season',
        icon: '🎣',
        color: 0x3498DB,
        fishLuck: 1.5, // 1.5x luck
        fishIncome: 0.5 // +50% fishing income
    },
    'hacker_era': {
        id: 'hacker_era',
        icon: '💻',
        color: 0x27AE60,
        jobMatch: 'hacker',
        minigameBonus: 0.5 // +50% rewards
    },
    'police_patrol': {
        id: 'police_patrol',
        icon: '🚔',
        color: 0x34495E,
        jobMatch: 'police',
        salaryBuff: 0.5 // +50% work salary
    },
    'criminal_night': {
        id: 'criminal_night',
        icon: '🌑',
        color: 0xE74C3C,
        jobMatch: 'criminal',
        crimeBonus: 0.5 // +50% crime/rob gains
    },
    'golden_harvest': {
        id: 'golden_harvest',
        icon: '🌾',
        color: 0xF1C40F,
        jobMatch: 'farmer',
        fishLuck: 1.3,
        workBonus: 0.4
    },
    'trader_heaven': {
        id: 'trader_heaven',
        icon: '💹',
        color: 0xF39C12,
        jobMatch: 'trader',
        businessBonus: 0.5
    },
    'police_raid': {
        id: 'police_raid',
        icon: '🚔',
        color: 0x2C3E50,
        raidChanceMultiplier: 15.0, // 15x higher chance during event
        penaltyMultiplier: 1.5 // 1.5x higher penalty
    }
};

async function getCurrentEvent(guildId) {
    if (!guildId) return EVENTS['none'];

    const eventId = await db.getGuildSetting(guildId, 'current_event', 'none');
    const startTime = await db.getGuildSetting(guildId, 'event_start_time', '0');
    const duration = await db.getGuildSetting(guildId, 'event_duration', '0');

    const event = EVENTS[eventId] || EVENTS['none'];
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = parseInt(startTime) + parseInt(duration);

    if (eventId !== 'none' && now > expiresAt) {
        await rotateEvent(guildId);
        return getCurrentEvent(guildId);
    }

    return {
        ...event,
        expiresAt,
        remaining: expiresAt - now
    };
}

async function rotateEvent(guildId) {
    if (!guildId) return 'none';

    const eventIds = Object.keys(EVENTS).filter(id => id !== 'none');
    const randomEventId = eventIds[Math.floor(Math.random() * eventIds.length)];

    // Duration: 6 hours
    const duration = 6 * 3600;
    const now = Math.floor(Date.now() / 1000);

    await db.setGuildSetting(guildId, 'current_event', randomEventId);
    await db.setGuildSetting(guildId, 'event_start_time', now.toString());
    await db.setGuildSetting(guildId, 'event_duration', duration.toString());

    console.log(`[EventSystem] Guild ${guildId}: New event started: ${randomEventId} for 6 hours.`);
    return randomEventId;
}

module.exports = {
    EVENTS,
    getCurrentEvent,
    rotateEvent
};
