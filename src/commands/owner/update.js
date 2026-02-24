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
            await msg.edit(`✅ **Git Pull Successful:**\n\`\`\`${output.substring(0, 500)}\`\`\`\n🔄 **Restarting via PM2...**`);

            // Execute PM2 restart
            exec('pm2 restart index', async (pm2Error) => {
                if (pm2Error) {
                    console.error('PM2 restart error:', pm2Error);
                    await msg.edit(`⚠️ **Git Pull Success, but PM2 restart failed.**\nFalling back to hot-reload...\nError: \`${pm2Error.message}\``);

                    try {
                        // Hot reload logic (moving most of it here for cleanliness if needed, 
                        // but let's just keep the original structure for now)
                        message.client.commands.clear();
                        const srcPath = path.resolve(__dirname, '../../');
                        const normalizedSrcPath = srcPath.toLowerCase();

                        Object.keys(require.cache).forEach(cacheKey => {
                            if (cacheKey.toLowerCase().startsWith(normalizedSrcPath)) {
                                delete require.cache[cacheKey];
                            }
                        });

                        const commandsPath = path.join(__dirname, '../');
                        const commandFolders = fs.readdirSync(commandsPath);

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
                        await msg.edit(`✅ **Update Successful!**\nHot-reloaded as PM2 was unavailable.\n\`\`\`${output.substring(0, 400)}\`\`\``);
                    } catch (reloadError) {
                        console.error('Reload error:', reloadError);
                        await msg.edit(`❌ **Commands reloaded with errors:**\n\`\`\`${reloadError.message}\`\`\``);
                    }
                }
            });
        });
    },
};
