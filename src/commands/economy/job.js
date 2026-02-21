const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'job',
    aliases: ['career', 'occup'],
    description: 'View or set your career',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);
        const sub = args[0]?.toLowerCase();

        if (sub === 'list' || !sub) {
            const jobs = config.ECONOMY.JOBS;
            const embed = new EmbedBuilder()
                .setTitle(t('job.list_title', lang))
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.client.user.displayAvatarURL());

            let desc = '';
            Object.values(jobs).forEach(j => {
                const name = t(`job.info_${j.id}`, lang);
                desc += `${j.icon} **${j.id.charAt(0).toUpperCase() + j.id.slice(1)}**\n*${name}*\n\n`;
            });

            embed.setDescription(t('job.list_desc', lang) + '\n\n' + desc);
            return message.reply({ embeds: [embed] });
        }

        if (sub === 'set') {
            const jobId = args[1]?.toLowerCase();
            if (!jobId) return message.reply(t('job.set_error_invalid', lang));

            const job = config.ECONOMY.JOBS[jobId];
            if (!job) return message.reply(t('job.set_error_invalid', lang));

            if (user.job === job.id) return message.reply(t('job.already_has', lang));
            if (user.level < 20) return message.reply(t('job.set_error_level', lang, { level: 20 }));

            db.updateUser(message.author.id, { job: job.id });
            return message.reply(t('job.set_success', lang, { job: job.id.charAt(0).toUpperCase() + job.id.slice(1) }));
        }

        if (sub === 'info' || sub === 'me') {
            const jobName = user.job ? user.job.charAt(0).toUpperCase() + user.job.slice(1) : t('job.none', lang);
            return message.reply(t('job.current', lang, { job: jobName }));
        }
    }
};
