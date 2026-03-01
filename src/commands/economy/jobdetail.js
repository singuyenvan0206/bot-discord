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

        const job = config.ECONOMY.JOBS[jobName];
        if (!job) {
            return message.reply(t('job.set_error_invalid', lang));
        }

        const name = t(`job.name_${jobName}`, lang);
        const description = t(`job.desc_${jobName}`, lang);
        const perks = t(`job.info_${jobName}`, lang).split('\n').filter(p => p.trim()).map(p => `• ${p.trim()}`).join('\n');
        const salaryBonus = job.bonus ? `+${Math.round((job.bonus - 1) * 100)}%` : 'None';
        const luckBonus = job.luck ? `x${job.luck}` : 'None';

        const embed = new EmbedBuilder()
            .setTitle(`${job.icon} ${name}`)
            .setDescription(`*${description}*`)
            .addFields(
                { name: '💼 ' + t('job.salary_label', lang), value: `\`${salaryBonus} Bonus\``, inline: true },
                { name: '🍀 ' + t('job.luck_label', lang), value: `\`${luckBonus} Luck\``, inline: true },
                { name: '⭐ ' + t('job.requirement_label', lang), value: `\`Level 20\``, inline: true },
                { name: '✨ ' + t('job.perks_title', lang), value: perks || t('common.none', lang), inline: false }
            )
            .setColor(job.color || config.COLORS.INFO)
            .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: t('common.requested_by', lang, { user: message.author.tag }), iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        return message.reply({ embeds: [embed] });
    }
};
