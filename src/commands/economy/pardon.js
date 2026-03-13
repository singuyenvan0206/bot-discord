const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'pardon',
    aliases: ['anxa', 'clearbounty'],
    description: 'Xóa lệnh truy nã đang hoạt động cho một người (Pardon a wanted person)',
    usage: '@user',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const target = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) return message.reply(t('common.user_not_found', lang));

        // Check permission: Only Police Chief or Bot Owner
        const userJob = await db.getUserJob(message.author.id, message.guild.id);
        if (userJob !== 'police_chief' && message.author.id !== config.OWNER_ID) {
            return message.reply(t('chief.police_chief_only', lang));
        }

        const targetData = await db.getUser(target.id, message.guild.id);
        const bounty = Number(targetData.bounty || 0);

        if (bounty <= 0 && Number(targetData.wanted_level || 0) <= 0) {
            return message.reply(t('pardon.no_bounty', lang, { user: target.username }));
        }

        // Clear bounty
        await db.execute(
            `UPDATE users SET 
            bounty = 0, 
            wanted_level = 0, 
            wanted_expires_at = 0, 
            bounty_placers = '[]'
            WHERE id = ?`,
            [target.id]
        );

        const embed = new EmbedBuilder()
            .setTitle(`🕊️ ${t('pardon.title', lang)}`)
            .setColor(config.COLORS.SUCCESS)
            .setDescription(t('pardon.success_desc', lang, {
                chief: message.author.username,
                target: target.username,
                amount: bounty.toLocaleString()
            }))
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
