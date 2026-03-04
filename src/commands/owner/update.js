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
        });
    },
};
