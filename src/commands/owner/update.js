const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'update',
    aliases: ['upd'],
    description: 'Cập nhật bot từ GitHub (Update bot from GitHub)',
    ownerOnly: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);



        const msg = await message.reply('🔄 **Updating source code...**');

        exec('git pull', async (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return msg.edit(`❌ **Update failed:**\n\`\`\`${error.message}\`\`\``);
            }

            let output = stdout || stderr;
            await msg.edit(`✅ **Git Pull Successful:**\n\`\`\`${output.substring(0, 500)}\`\`\`\n🔄 **Saving DB & Restarting via PM2...**`);

            try {
                const db = require('../../database');
                await db.saveDb();
                console.log(`[Update] Database saved. Bot ID: ${message.client.user.id} (${message.client.user.tag})`);
            } catch (saveErr) {
                console.error('[Update] Failed to save DB before restart:', saveErr);
            }

            // Execute PM2 restart
            // exec('pm2 restart index', async (pm2Error) => {
            //     if (pm2Error) {
            //         console.error('PM2 restart error:', pm2Error);
            //         await msg.edit(`⚠️ **Git Pull Success, but PM2 restart failed.**\nFalling back to hot-reload...\nError: \`${pm2Error.message}\``);

            //         try {
            //             // Hot reload logic (moving most of it here for cleanliness if needed, 
            //             // but let's just keep the original structure for now)
            //             message.client.commands.clear();
            //             const srcPath = path.resolve(__dirname, '../../');
            //             const normalizedSrcPath = srcPath.toLowerCase();

            //             Object.keys(require.cache).forEach(cacheKey => {
            //                 if (cacheKey.toLowerCase().startsWith(normalizedSrcPath)) {
            //                     delete require.cache[cacheKey];
            //                 }
            //             });

            //             const commandsPath = path.join(__dirname, '../');
            //             const commandFolders = fs.readdirSync(commandsPath);

            //             const db = require('../../database');
            //             await db.getDb();

            //             const loadCommandsRecursive = (dir) => {
            //                 const files = fs.readdirSync(dir);
            //                 for (const file of files) {
            //                     const filePath = path.join(dir, file);
            //                     const stat = fs.lstatSync(filePath);
            //                     if (stat.isDirectory()) {
            //                         loadCommandsRecursive(filePath);
            //                     } else if (file.endsWith('.js')) {
            //                         delete require.cache[require.resolve(filePath)];
            //                         const command = require(filePath);
            //                         if ('name' in command && 'execute' in command) {
            //                             message.client.commands.set(command.name, command);
            //                             if (command.aliases && Array.isArray(command.aliases)) {
            //                                 command.aliases.forEach(alias => message.client.commands.set(alias, command));
            //                             }
            //                         }
            //                     }
            //                 }
            //             };

            //             loadCommandsRecursive(commandsPath);
            //             await msg.edit(`✅ **Update Successful!**\nHot-reloaded as PM2 was unavailable.\n\`\`\`${output.substring(0, 400)}\`\`\``);
            //         } catch (reloadError) {
            //             console.error('Reload error:', reloadError);
            //             await msg.edit(`❌ **Commands reloaded with errors:**\n\`\`\`${reloadError.message}\`\`\``);
            //         }
            //     }
            // });
        });
    },
};
