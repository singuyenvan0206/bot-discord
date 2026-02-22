const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'rank',
    aliases: ['top', 'lb'],
    description: 'Hiển thị bảng xếp hạng trên máy chủ này',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);

        let targetJobId = null;
        if (args[0]) {
            const inputJob = args[0].toLowerCase();
            const jobs = config.ECONOMY.JOBS;
            const foundJob = Object.values(jobs).find(j => j.id === inputJob || t(`job.name_${j.id}`, lang).toLowerCase() === inputJob);
            if (foundJob) targetJobId = foundJob.id;
        }

        const data = await getLeaderboardData(message.guild, 'xp', targetJobId, message.author.id, lang);
        return message.reply(data);
    },
    // Export for interaction handling
    getLeaderboardData
};

async function getLeaderboardData(guild, sortBy = 'xp', jobId = null, authorId = null, lang = 'vi') {
    const jobs = config.ECONOMY.JOBS;
    const targetJob = jobId ? jobs[jobId] : null;

    // Fetch top 100 users by the chosen criteria
    const filter = jobId ? { column: 'job', value: jobId } : null;
    const topUsers = db.getTopUsers(100, sortBy, filter);
    const guildMembers = [];

    for (const u of topUsers) {
        if (guildMembers.length >= 10) break;

        try {
            let member = guild.members.cache.get(u.id);
            if (!member) {
                member = await guild.members.fetch(u.id).catch(() => null);
            }

            if (member) {
                guildMembers.push({
                    username: member.user.username,
                    level: u.level,
                    balance: u.balance,
                    job: u.job,
                    userId: u.id
                });
            }
        } catch (e) { }
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = guildMembers.map((u, i) => {
        const rankLabel = medals[i] || `**${i + 1}.**`;
        const isAuthor = authorId && u.userId === authorId ? ` **(${t('rank.you', lang)})**` : '';
        const jobDisplay = u.job && !jobId ? ` | ${t(`job.name_${u.job}`, lang) || u.job}` : '';
        const valueDisplay = sortBy === 'xp'
            ? `${t('profile.level_label', lang)} **${u.level}**`
            : `${config.EMOJIS.COIN} **${u.balance.toLocaleString()}**`;

        return `${rankLabel} ${u.username} — ${valueDisplay}${jobDisplay}${isAuthor}`;
    });

    let title;
    if (jobId) {
        const jobName = jobId.charAt(0).toUpperCase() + jobId.slice(1);
        title = t('rank.leaderboard_job_title', lang, { server: guild.name, job: jobName });
    } else if (sortBy === 'balance') {
        title = t('rank.leaderboard_balance_title', lang, { server: guild.name });
    } else {
        title = t('rank.leaderboard_title', lang, { server: guild.name });
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join('\n') || t('leaderboard.empty', lang))
        .setColor(targetJob ? targetJob.color : config.COLORS.INFO)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: t('rank.footer', lang) })
        .setTimestamp();

    // Components
    const jobMenu = new StringSelectMenuBuilder()
        .setCustomId(`rank_job_select_${sortBy}`)
        .setPlaceholder(t('rank.select_job', lang))
        .addOptions([
            { label: t('rank.all_jobs', lang), value: 'all', emoji: '🏆', default: !jobId },
            ...Object.values(jobs).map(j => ({
                label: j.id.charAt(0).toUpperCase() + j.id.slice(1),
                value: j.id,
                emoji: j.icon,
                default: jobId === j.id
            }))
        ]);

    const sortMenu = new StringSelectMenuBuilder()
        .setCustomId(`rank_sort_select_${jobId || 'all'}`)
        .setPlaceholder(t('rank.select_sort', lang))
        .addOptions([
            { label: t('rank.sort_xp', lang), value: 'xp', emoji: '✨', default: sortBy === 'xp' },
            { label: t('rank.sort_balance', lang), value: 'balance', emoji: '💰', default: sortBy === 'balance' }
        ]);

    const row1 = new ActionRowBuilder().addComponents(jobMenu);
    const row2 = new ActionRowBuilder().addComponents(sortMenu);

    return { embeds: [embed], components: [row1, row2] };
}
