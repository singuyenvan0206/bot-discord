const db = require('./src/database');
const { processHouseDistribution } = require('./src/utils/timer');

async function verify() {
    try {
        console.log('--- Final Force Distribution Verification ---');
        
        const botId = '479275782670254081';
        const guildId = '842019145020997679';

        // Mock Client
        const mockClient = {
            user: { id: botId, username: 'MockBot', displayAvatarURL: () => 'http://example.com' },
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

        console.log('Running processHouseDistribution...');
        await processHouseDistribution(mockClient);

        const finalBalance = await db.getGuildSetting(guildId, 'bot_balance', 0);
        console.log(`Final bot_balance in guild_settings: ${finalBalance}`);
        
        if (finalBalance === 0) {
            console.log('✅ SUCCESS: Distribution triggered and reset balance.');
        } else {
            console.log('❌ FAILURE: Distribution did not occur.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verify();
