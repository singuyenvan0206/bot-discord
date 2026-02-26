const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isManager } = require('../../utils/permissions');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'update',
    description: '[OWNER] Cập nhật mã nguồn và khởi động lại (Update source code and restart)',
    ownerOnly: true,
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
            await msg.edit(`✅ **Git Pull Successful:**\n\`\`\`${output.substring(0, 500)}\`\`\`\n🔄 **Saving DB & Restarting via PM2...**`);

            try {
                const db = require('../../database');
                db.saveDb();
                console.log(`[Update] Database saved. Bot ID: ${message.client.user.id} (${message.client.user.tag})`);
            } catch (saveErr) {
                console.error('[Update] Failed to save DB before restart:', saveErr);
            }

            // Execute PM2 restart

        });
    },
};
