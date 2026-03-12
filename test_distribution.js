const db = require('./src/database');
const { processHouseDistribution } = require('./src/utils/timer');
const config = require('./src/config');

async function test() {
    try {
        console.log('--- Starting Distribution Test ---');
        
        // 1. Setup - find a guild and its users
        const guilds = await db.queryAll('SELECT id FROM guilds LIMIT 1');
        if (guilds.length === 0) {
            console.error('No guilds found in database to test.');
            process.exit(1);
        }
        const guildId = guilds[0].id;
        console.log(`Testing on guild: ${guildId}`);

        // 2. Set botId (mock)
        const mockBotId = 'BOT_MOCK_ID_' + Date.now();
        await db.setBotId(mockBotId);
        console.log(`Mock Bot ID: ${mockBotId}`);

        // 3. Ensure some human users exist in this guild for testing
        // We'll just use existing ones or create a dummy
        let users = await db.getTopUsers(guildId, 10, 'balance');
        const humans = users.filter(u => u.id !== mockBotId);
        
        if (humans.length === 0) {
            console.log('No humans found, creating dummy test users...');
            await db.execute('INSERT INTO users (id, balance) VALUES (?, ?) ON CONFLICT DO NOTHING', ['TEST_HUMAN_1', 1000]);
            await db.execute('INSERT INTO user_guilds (userId, guildId) VALUES (?, ?) ON CONFLICT DO NOTHING', ['TEST_HUMAN_1', guildId]);
            await db.execute('INSERT INTO users (id, balance) VALUES (?, ?) ON CONFLICT DO NOTHING', ['TEST_HUMAN_2', 1000]);
            await db.execute('INSERT INTO user_guilds (userId, guildId) VALUES (?, ?) ON CONFLICT DO NOTHING', ['TEST_HUMAN_2', guildId]);
        }

        // 4. Set a high bot balance
        const testAmount = 50000;
        await db.setGuildSetting(guildId, 'bot_balance', testAmount);
        console.log(`Set bot_balance to ${testAmount} for testing.`);

        // 5. Clear last distribution time to force it
        await db.setGuildSetting(guildId, 'last_house_distribution', '0');
        await db.setGuildSetting(guildId, 'last_house_distribution_window', '');

        // 6. Mock Client
        const mockClient = {
            user: { id: mockBotId, username: 'MockBot', displayAvatarURL: () => 'http://example.com' },
            guilds: {
                cache: new Map([
                    [guildId, {
                        id: guildId,
                        name: 'Test Guild',
                        channels: {
                            cache: new Map()
                        },
                        members: {
                            me: { permissionsFor: () => ({ has: () => true }) }
                        }
                    }]
                ])
            }
        };

        // 7. Run distribution
        console.log('Running processHouseDistribution...');
        await processHouseDistribution(mockClient);

        // 8. Verify
        const newBalance = await db.getGuildSetting(guildId, 'bot_balance', 0);
        console.log(`Verified new bot_balance: ${newBalance}`);

        if (newBalance === 0) {
            console.log('✅ SUCCESS: Fund distributed and balance reset.');
        } else {
            console.error('❌ FAILURE: Balance was not reset to 0.');
        }

        const lastDist = await db.getGuildSetting(guildId, 'last_house_distribution', '0');
        console.log(`Last distribution timestamp: ${lastDist}`);

        process.exit(0);
    } catch (err) {
        console.error('Test failed with error:', err);
        process.exit(1);
    }
}

test();
