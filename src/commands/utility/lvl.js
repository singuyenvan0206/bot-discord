const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'level',
    aliases: ['lvl'],
    description: 'Hiển thị cấp độ và kinh nghiệm hiện tại (Displays current level and XP)',
    skipXp: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null)
            || message.author;

        const dbUser = db.getUser(user.id);

        // Calculate XP Progress
        const currentLevelXp = (dbUser.level / 0.1) ** 2;
        const nextLevelXp = ((dbUser.level + 1) / 0.1) ** 2;
        const xpNeeded = nextLevelXp - currentLevelXp;
        const xpProgress = dbUser.xp - currentLevelXp;
        const progressPercent = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100));

        // Create Progress Bar (10 blocks)
        const filledBlocks = Math.floor(progressPercent / 10);
        const emptyBlocks = 10 - filledBlocks;
        const progressBar = '▮'.repeat(filledBlocks) + '▯'.repeat(emptyBlocks);

        const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(t('profile.level_label', lang) + ` ${dbUser.level}`)
            .setDescription(`\`${progressBar}\` ${Math.floor(progressPercent)}%\n(${Math.floor(dbUser.xp).toLocaleString()}/${Math.floor(nextLevelXp).toLocaleString()} XP)`)
            .setColor(config.COLORS.INFO)
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
