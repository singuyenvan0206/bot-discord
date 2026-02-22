const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'jobdetail',
    aliases: ['jd', 'careerinfo', 'jobinfo'],
    description: 'Xem chi tiết về các nghề nghiệp',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const jobName = args[0]?.toLowerCase();

        if (!jobName) {
            return message.reply(t('job.detail_usage', lang, { prefix: config.PREFIX }));
        }

        const job = config.ECONOMY.JOBS[jobName];
        if (!job) {
            return message.reply(t('job.set_error_invalid', lang));
        }

        const description = t(`job.job_details.${jobName}`, lang, { prefix: config.PREFIX });
        const embed = new EmbedBuilder()
            .setTitle(`${job.icon} ${jobName.charAt(0).toUpperCase() + jobName.slice(1)}`)
            .setDescription(description)
            .setColor(job.color || config.COLORS.INFO)
            .setThumbnail(message.client.user.displayAvatarURL())
            .setFooter({ text: t('common.requested_by', lang, { user: message.author.tag }) });

        return message.reply({ embeds: [embed] });
    }
};
