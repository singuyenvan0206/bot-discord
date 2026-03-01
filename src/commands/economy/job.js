const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'job',
    aliases: ['j', 'career'],
    description: 'Nghề nghiệp (Manage career)',
    cooldown: 5,
    subcommands: {
        'list': 'Xem danh sách các nghề nghiệp có sẵn và đặc quyền.',
        'info': 'Xem thông tin chi tiết về nghề nghiệp hiện tại của bạn.',
        'select <id>': 'Chọn một nghề nghiệp mới.'
    },
    examples: ['list', 'info', 'select 1'],
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const sub = args[0]?.toLowerCase();

        if (sub === 'list' || sub === 'ls' || sub === 'l' || !sub) {
            const jobs = config.ECONOMY.JOBS;
            const embed = new EmbedBuilder()
                .setTitle(t('job.list_title', lang))
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 256 }));

            let desc = '';
            Object.values(jobs).forEach(j => {
                const name = t(`job.name_${j.id}`, lang);
                const info = t(`job.info_${j.id}`, lang);
                desc += `${j.icon} **${name}**\n${info}\n\n`;
            });

            embed.setDescription(t('job.list_desc', lang) + '\n\n' + desc + `\n${t('job.tip_detail', lang, { prefix: config.PREFIX })}`);
            return message.reply({ embeds: [embed] });
        }

        if (sub === 'set' || sub === 'select' || sub === 's') {
            const jobId = args[1]?.toLowerCase();
            if (!jobId) return message.reply(t('job.set_error_invalid', lang));

            const job = config.ECONOMY.JOBS[jobId];
            if (!job) return message.reply(t('job.set_error_invalid', lang));

            if (user.job === job.id) return message.reply(t('job.already_has', lang));

            // Requirements (Example: Level 20)
            if (user.level < 20) return message.reply(t('job.set_error_level', lang, { level: 20 }));

            await db.updateUser(message.guild.id, message.author.id, { job: job.id });
            const jobName = t(`job.name_${job.id}`, lang);
            return message.reply(t('job.set_success', lang, { job: jobName }));
        }

        if (sub === 'info' || sub === 'me' || sub === 'i') {
            if (!user.job) return message.reply(t('job.none', lang));

            const job = config.ECONOMY.JOBS[user.job];
            const name = t(`job.name_${user.job}`, lang);
            const info = t(`job.info_${user.job}`, lang);

            const embed = new EmbedBuilder()
                .setTitle(`💼 ${t('job.current_title', lang)}`)
                .setDescription(`${job.icon} **${name}**\n\n${info}`)
                .setColor(job.color || config.COLORS.INFO)
                .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true, size: 256 }) });

            return message.reply({ embeds: [embed] });
        }
    }
};
