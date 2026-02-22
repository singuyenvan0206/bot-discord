const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'rank',
    aliases: ['level', 'lvl'],
    description: 'Hiển thị cấp độ và nghề nghiệp của người dùng',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = message.mentions.users.first()
            || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null)
            || message.author;

        const dbUser = db.getUser(user.id);

        // Calculate XP Progress
        // Formula: XP = (Level / 0.1)^2  => Level = 0.1 * sqrt(XP)
        const nextLevel = dbUser.level + 1;
        const currentLevelXp = Math.pow(dbUser.level / 0.1, 2);
        const nextLevelXp = Math.pow(nextLevel / 0.1, 2);

        const xpNeeded = nextLevelXp - currentLevelXp;
        const xpProgress = dbUser.xp - currentLevelXp;
        const progressPercent = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100));

        // Create Progress Bar (10 blocks)
        const filledBlocks = Math.floor(progressPercent / 10);
        const emptyBlocks = 10 - filledBlocks;
        const progressBar = '▮'.repeat(filledBlocks) + '▯'.repeat(emptyBlocks);

        const embed = new EmbedBuilder()
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(t('rank.title', lang))
            .setColor(config.COLORS.INFO)
            .addFields(
                { name: t('job.name_field', lang), value: dbUser.job ? dbUser.job.charAt(0).toUpperCase() + dbUser.job.slice(1) : t('job.none', lang), inline: true },
                { name: t('profile.experience', lang), value: t('profile.level', lang, { level: dbUser.level }) + `\n\`${progressBar}\` ${Math.floor(progressPercent)}%\n(${Math.floor(dbUser.xp).toLocaleString()} / ${Math.floor(nextLevelXp).toLocaleString()} XP)`, inline: false }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
