require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in .env file');
    process.exit(1);
}

// Load all commands
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: /${command.data.name}`);
    }
}

// Deploy globally
const rest = new REST().setToken(TOKEN);

(async () => {
    try {
        console.log(`\n🔄 Registering ${commands.length} command(s) globally...\n`);

        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Successfully registered ${data.length} global command(s)!`);
        console.log('\n💡 Note: Global commands can take up to 1 hour to appear.');
        console.log('   For instant testing, you can modify this script to use guild commands.\n');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
