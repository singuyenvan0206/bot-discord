const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'update',
    aliases: ['upd'],
    description: 'Update bot from GitHub or restart local instance (Cập nhật hoặc khởi động lại)',
    ownerOnly: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const subCommand = args[0]?.toLowerCase();

        const msg = await message.reply('🔄 **Initializing update/restart sequence...**');

        // Function to perform hot-reload as fallback
        const performHotReload = async (currentOutput) => {
            try {
                message.client.commands.clear();
                const srcPath = path.resolve(__dirname, '../../');
                const normalizedSrcPath = srcPath.toLowerCase();

                Object.keys(require.cache).forEach(cacheKey => {
                    if (cacheKey.toLowerCase().startsWith(normalizedSrcPath)) {
                        delete require.cache[cacheKey];
                    }
                });

                const commandsPath = path.join(__dirname, '../');
                const db = require('../../database');
                await db.getDb(); // Re-sync DB just in case

                const loadCommandsRecursive = (dir) => {
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const filePath = path.join(dir, file);
                        const stat = fs.lstatSync(filePath);
                        if (stat.isDirectory()) {
                            loadCommandsRecursive(filePath);
                        } else if (file.endsWith('.js')) {
                            delete require.cache[require.resolve(filePath)];
                            const command = require(filePath);
                            if ('name' in command && 'execute' in command) {
                                message.client.commands.set(command.name, command);
                                if (command.aliases && Array.isArray(command.aliases)) {
                                    command.aliases.forEach(alias => message.client.commands.set(alias, command));
                                }
                            }
                        }
                    }
                };

                loadCommandsRecursive(commandsPath);
                await msg.edit(`✅ **Hot-Reload Successful!**\nCommands have been re-cached without process restart.\n\`\`\`${currentOutput || 'Local manual sync completed.'}\`\`\``);
            } catch (reloadError) {
                console.error('Reload error:', reloadError);
                await msg.edit(`❌ **Critical Failure:** Hot-reload failed after restart attempt.\n\`\`\`${reloadError.message}\`\`\``);
            }
        };

        const restartBot = async (currentOutput) => {
            await msg.edit(`${msg.content}\n🔄 **Saving Database & Restarting...**`);
            try {
                const db = require('../../database');
                await db.saveDb();
            } catch (err) {
                console.error('[Update] DB save fail:', err);
            }

            // Attempt PM2 restart (try 'simsimi-bot', then current script name, then 'all' as last resort)
            const pm2Name = process.env.PM2_NAME || 'simsimi-bot';
            exec(`pm2 restart ${pm2Name}`, (pm2Error) => {
                if (pm2Error) {
                    console.warn(`[Update] PM2 restart (${pm2Name}) failed, trying 'all'...`);
                    exec('pm2 restart all', (allError) => {
                        if (allError) {
                            console.error('[Update] All restart attempts failed. Falling back to Hot-Reload.');
                            performHotReload(currentOutput);
                        }
                    });
                }
            });
        };

        // SUBCOMMAND: RESTART ONLY
        if (subCommand === 'restart' || subCommand === 'reload') {
            return restartBot('Manual restart triggered.');
        }

        // DEFAULT: GIT PULL + RESTART
        // 1. Check for local changes first
        exec('git status --porcelain', (statusErr, statusOut) => {
            if (statusErr) return msg.edit(`❌ **Git Error:** ${statusErr.message}`);

            if (statusOut.trim().length > 0) {
                return msg.edit(`⚠️ **Local Changes Detected!**\nRunning \`git pull\` might cause conflicts or overwrite AI fixes.\n\nTo skip this and restart anyway, use \`!update restart\`.\nTo proceed with pull, please commit or discard changes manually.`);
            }

            // 2. Perform pull
            exec('git pull', (pullErr, pullOut) => {
                if (pullErr) {
                    return msg.edit(`❌ **Git Pull Failed:**\n\`\`\`${pullErr.message}\`\`\``);
                }

                if (pullOut.includes('Already up to date')) {
                    return msg.edit(`ℹ️ **Already up to date.**\nRestarting anyway to ensure consistency...`).then(() => restartBot(pullOut));
                }

                msg.edit(`✅ **Git Pull Success!**\n\`\`\`${pullOut.substring(0, 400)}\`\`\``).then(() => restartBot(pullOut));
            });
        });
    },
};
