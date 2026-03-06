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

const { EmbedBuilder } = require('discord.js');

async function getCurrentEvent(guildId, client = null) {
    if (!guildId) return EVENTS['none'];

    const eventId = await db.getGuildSetting(guildId, 'current_event', 'none');
    const startTime = await db.getGuildSetting(guildId, 'event_start_time', '0');
    const duration = await db.getGuildSetting(guildId, 'event_duration', '0');

    const event = EVENTS[eventId] || EVENTS['none'];
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = parseInt(startTime) + parseInt(duration);

    if (eventId !== 'none' && now > expiresAt) {
        await rotateEvent(guildId, client);
        return getCurrentEvent(guildId, client);
    }

    return {
        ...event,
        expiresAt,
        remaining: expiresAt - now
    };
}

async function rotateEvent(guildId, client = null) {
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

    // Announcement Logic
    if (client) {
        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (guild) {
                const guildData = await db.getGuild(guildId);
                const channelId = guildData.dist_channel;

                if (channelId) {
                    const channel = await guild.channels.fetch(channelId).catch(() => null);
                    if (channel && channel.isTextBased()) {
                        const { t } = require('./i18n');
                        const lang = guildData.language || 'vi';
                        const event = EVENTS[randomEventId];

                        const embed = new EmbedBuilder()
                            .setTitle(t('event.new_event_title', lang))
                            .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
                            .setDescription(`${t('event.new_event_announce', lang)}\n\n${event.icon} **${t('event.name_' + randomEventId, lang)}**\n${t('event.desc_' + randomEventId, lang)}`)
                            .setColor(event.color)
                            .addFields({ name: '⏱️ ' + t('event.duration', lang), value: '`6h`', inline: true })
                            .setTimestamp()
                            .setFooter({ text: t('event.footer', lang) });

                        await channel.send({ embeds: [embed] }).catch(() => { });
                    }
                }
            }
        } catch (e) {
            console.error(`[EventSystem] Failed to send announcement for guild ${guildId}:`, e);
        }
    }

    return randomEventId;
}

module.exports = {
    EVENTS,
    getCurrentEvent,
    rotateEvent
};
