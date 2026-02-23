const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isManager } = require('../../utils/permissions');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'update',
    description: 'Pulls the latest code from Git and reloads all commands.',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        if (!isManager(message.member)) {
            return message.reply(t('common.no_permission', lang));
        }

        const msg = await message.reply('🔄 **Updating source code...**');

        exec('git pull', async (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return msg.edit(`❌ **Update failed:**\n\`\`\`${error.message}\`\`\``);
            }

            let output = stdout || stderr;
            await msg.edit(`✅ **Git Pull Successful:**\n\`\`\`${output.substring(0, 1000)}\`\`\`\n🔄 **Reloading commands...**`);

            try {
                // Clear command collection
                message.client.commands.clear();

                // Clear all files in src from require cache to ensure utilities like database are reloaded
                const srcPath = path.join(__dirname, '../../'); // The src/ directory
                Object.keys(require.cache).forEach(cacheKey => {
                    if (cacheKey.startsWith(srcPath)) {
                        delete require.cache[cacheKey];
                    }
                });

                // Re-require and load all commands
                const commandsPath = path.join(__dirname, '../'); // /src/commands/
                const commandFolders = fs.readdirSync(commandsPath);

                // Re-initialize database after reloading
                const db = require('../../database');
                await db.getDb();

                for (const folder of commandFolders) {
                    const folderPath = path.join(commandsPath, folder);
                    if (fs.lstatSync(folderPath).isDirectory()) {
                        const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
                        for (const file of commandFiles) {
                            const filePath = path.join(folderPath, file);
                            const command = require(filePath);
                            if ('name' in command && 'execute' in command) {
                                message.client.commands.set(command.name, command);
                                if (command.aliases && Array.isArray(command.aliases)) {
                                    command.aliases.forEach(alias => message.client.commands.set(alias, command));
                                }
                            }
                        }
                    }
                }

                await msg.edit(`✅ **Update and Reload complete!**\nUtilities and commands have been hot-reloaded.\n\`\`\`${output.substring(0, 400)}\`\`\``);
                console.log('🔄 All commands and utilities have been hot-reloaded.');
            } catch (reloadError) {
                console.error('Reload error:', reloadError);
                await msg.edit(`❌ **Commands reloaded with errors:**\n\`\`\`${reloadError.message}\`\`\``);
            }
        });
    },
};
