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
        const perks = t(`job.info_${actualJobId}`, lang).split('\n').filter(p => p.trim()).map(p => p.trim().startsWith('•') ? p.trim() : `• ${p.trim()}`).join('\n');

        // Accurate Statistics
        const jobBonusMult = job.bonus || 1;
        const bonusVal = Math.round((jobBonusMult - 1) * 100);
        const salaryBonus = bonusVal >= 0 ? `+${bonusVal}%` : `${bonusVal}%`;
        const luckBonus = job.luck ? `x${job.luck}` : 'None';

        // Calculate Salary Range based on work.js logic
        const minBase = config.ECONOMY.MIN_WORK_EARNINGS;
        const maxBase = config.ECONOMY.MAX_WORK_EARNINGS;

        // Estimation (Min-Max range without external multipliers)
        const estMin = Math.floor(minBase * jobBonusMult);
        const estMax = Math.floor(maxBase * jobBonusMult);
        const salaryRange = `\`${estMin.toLocaleString()} - ${estMax.toLocaleString()}\``;

        const embed = new EmbedBuilder()
            .setTitle(`${job.icon} ${name.replace(job.icon, '').trim()}`)
            .setDescription(`*${description}*`)
            .addFields(
                { name: '🆔 ' + t('job.id_label', lang), value: `\`${actualJobId}\` (ID: ${job.numericId.toLocaleString()})`, inline: true },
                { name: '⭐ ' + t('job.requirement_label', lang), value: `\`Level 20\``, inline: true },
                { name: '⏱️ ' + t('job.cooldown_label', lang), value: `\`1 Hour\``, inline: true },
                { name: '💼 ' + t('job.salary_label', lang), value: `\`${salaryBonus} Bonus\``, inline: true },
                { name: '🍀 ' + t('job.luck_label', lang), value: `\`${luckBonus} Luck\``, inline: true },
                { name: '💰 ' + t('job.est_salary_label', lang), value: salaryRange, inline: true },
                { name: '✨ ' + t('job.perks_title', lang), value: perks || t('common.none', lang), inline: false }
            )
            .setColor(job.color || config.COLORS.INFO)
            .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: t('common.requested_by', lang, { user: message.author.tag }), iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        return message.reply({ embeds: [embed] });
    }
};
