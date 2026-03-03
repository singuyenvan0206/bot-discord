const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'jobdetail',
    aliases: ['jd', 'jobinfo'],
    description: 'Chi tiết nghề (View job details)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const jobName = args[0]?.toLowerCase();

        if (!jobName) {
            return message.reply(t('job.detail_usage', lang, { prefix: config.PREFIX }));
        }

        let job = config.ECONOMY.JOBS[jobName];
        if (!job && !isNaN(jobName)) {
            job = Object.values(config.ECONOMY.JOBS).find(j => j.numericId === parseInt(jobName));
        }
        if (!job) {
            return message.reply(t('job.set_error_invalid', lang));
        }

        const actualJobId = job.id;
        const name = t(`job.name_${actualJobId}`, lang);
        const description = t(`job.desc_${actualJobId}`, lang);
        const rawPerks = t(`job.info_${actualJobId}`, lang).split('\n');
        // Clean up perks: remove titles and empty lines, ensure bullet points
        const perks = rawPerks
            .filter(p => p.trim() && !p.includes('**'))
            .map(p => p.trim().startsWith('•') ? p.trim() : `• ${p.trim()}`)
            .join('\n');

        // Accurate Statistics
        const jobBonusMult = job.bonus || 1;
        const bonusVal = Math.round((jobBonusMult - 1) * 100);
        const salaryBonus = bonusVal >= 0 ? `+${bonusVal}%` : `${bonusVal}%`;

        // Luck / XP Bonus
        let secondaryBonus = 'None';
        if (job.luck) secondaryBonus = `🍀 Luck x${job.luck}`;
        if (actualJobId === 'teacher') secondaryBonus = `📚 XP x2.0`;

        // Calculate Salary Range based on work.js config
        const minBase = config.ECONOMY.WORK_MIN || 1000;
        const maxBase = config.ECONOMY.WORK_MAX || 5000;

        // Estimation (Min-Max range with job bonus)
        const estMin = Math.floor(minBase * (1 + (job.bonus || 0)));
        const estMax = Math.floor(maxBase * (1 + (job.bonus || 0)));
        const salaryRange = `\`${estMin.toLocaleString()} - ${estMax.toLocaleString()}\``;

        const embed = new EmbedBuilder()
            .setTitle(`${job.icon} ${name.replace(job.icon, '').trim()}`)
            .setDescription(`*${description}*`)
            .addFields(
                { name: '🆔 ' + t('job.id_label', lang), value: `\`${job.numericId}\` (\`${actualJobId}\`)`, inline: true },
                { name: '⭐ ' + t('job.requirement_label', lang), value: `\`Level 20\``, inline: true },
                { name: '⏱️ ' + t('job.cooldown_label', lang), value: `\`1 Hour\``, inline: true },
                { name: '💼 ' + t('job.salary_label', lang), value: `\`+${Math.round((job.bonus || 0) * 100)}%\``, inline: true },
                { name: '✨ Extra', value: `\`${secondaryBonus}\``, inline: true },
                { name: '💰 ' + t('job.est_salary_label', lang), value: salaryRange, inline: true },
                { name: '💡 ' + t('job.perks_title', lang), value: perks || t('common.none', lang), inline: false }
            )
            .setColor(job.color || config.COLORS.INFO)
            .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: t('common.requested_by', lang, { user: message.author.tag }), iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        return message.reply({ embeds: [embed] });
    }
};
