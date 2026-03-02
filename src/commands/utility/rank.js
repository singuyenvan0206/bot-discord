const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'rank',
    aliases: ['lb', 'leaderboard', 'top', 'r'],
    description: 'Bảng xếp hạng (Leaderboard)',
    skipXp: true,

    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const sortBy = args[0] === 'money' || args[0] === 'balance' ? 'balance' : 'xp';

        let jobId = null;
        if (args[0] && config.ECONOMY.JOBS[args[0].toLowerCase()]) {
            jobId = args[0].toLowerCase();
        }

        const data = await getLeaderboardData(message.guild, sortBy, jobId, message.author.id, lang);
        return message.reply(data);
    },

    getLeaderboardData
};

async function getLeaderboardData(guild, sortBy = 'xp', jobId = null, authorId = null, lang = 'vi', traceId = 'CMD') {
    if (!guild) return { content: '❌ Command only works in a server.' };

    const startTime = Date.now();
    const jobs = config.ECONOMY.JOBS;
    const filter = jobId ? { column: 'job', value: jobId } : null;

    const topUsers = await db.getTopUsers(guild.id, 100, sortBy, filter);

    const generateUI = (currentSortBy, currentJobId, currentLang, embedData) => {
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rank_btn_sort_xp_${currentJobId || 'all'}`)
                .setLabel(t('rank.sort_xp', currentLang) || 'XP')
                .setStyle(currentSortBy === 'xp' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('✨'),
            new ButtonBuilder()
                .setCustomId(`rank_btn_sort_balance_${currentJobId || 'all'}`)
                .setLabel(t('rank.sort_balance', currentLang) || 'Số dư')
                .setStyle(currentSortBy === 'balance' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('💰')
        );

        const jobMenu = new StringSelectMenuBuilder()
            .setCustomId(`rank_menu_job_${currentSortBy}`)
            .setPlaceholder(t('rank.select_job', currentLang) || 'Lọc theo nghề...')
            .addOptions([
                { label: t('rank.all_jobs', currentLang) || 'Tất cả', value: 'all', emoji: '🏆', default: !currentJobId },
                ...Object.values(jobs).map(j => ({
                    label: t(`job.name_${j.id}`, currentLang) || j.id,
                    value: j.id,
                    emoji: j.icon,
                    default: currentJobId === j.id
                }))
            ]);

        const row2 = new ActionRowBuilder().addComponents(jobMenu);

        return {
            embeds: [embedData],
            components: [row1, row2]
        };
    };

    const emptyEmbed = new EmbedBuilder()
        .setDescription(t('rank.empty', lang) || 'Không có dữ liệu.')
        .setColor(config.COLORS.INFO);

    if (!topUsers || topUsers.length === 0) {
        return generateUI(sortBy, jobId, lang, emptyEmbed);
    }

    // Determine user IDs to fetch (top 10 + author if provided)
    const displayLimit = 10;
    const topUsersToDisplay = topUsers.slice(0, displayLimit);
    const userIds = [...new Set(topUsersToDisplay.map(u => u.id))];
    if (authorId) userIds.push(authorId);

    // Fetch members with a timeout/catch to prevent freezing
    const members = await guild.members.fetch({ user: userIds, withPresences: false }).catch(err => {
        console.error(`[Leaderboard Fetch Error]:`, err);
        return new Map();
    });

    const lines = [];
    const medals = ['🥇', '🥈', '🥉'];
    let position = 0;
    let authorPos = -1;

    // Track author rank in the full topUsers list (up to 100)
    if (authorId) {
        authorPos = topUsers.findIndex(u => u.id === authorId) + 1;
    }

    for (const u of topUsersToDisplay) {
        position++;
        const member = members.get(u.id);
        const username = member ? member.user.username : (u.id === authorId ? 'Bạn' : `Unknown (${u.id})`);

        const rankLabel = medals[position - 1] || `**${position}.**`;
        const isAuthor = u.id === authorId ? ` **(${t('rank.you', lang) || 'Bạn'})**` : '';
        const jobDisplay = u.job && !jobId ? ` | ${t(`job.name_${u.job}`, lang) || u.job}` : '';

        const valueDisplay = sortBy === 'balance'
            ? `${config.EMOJIS.COIN} **${(u.balance || 0).toLocaleString()}**`
            : `${t('profile.level_label', lang) || 'Level'} **${(u.level || 0).toLocaleString()}**`;

        lines.push(`${rankLabel} ${username} — ${valueDisplay}${jobDisplay}${isAuthor}`);
    }

    if (lines.length === 0) {
        return generateUI(sortBy, jobId, lang, emptyEmbed);
    }

    const serverName = guild.name || 'Server';
    let title = sortBy === 'balance' ? t('rank.leaderboard_balance_title', lang, { server: serverName }) : t('rank.leaderboard_title', lang, { server: serverName });
    if (jobId) title = t('rank.leaderboard_job_title', lang, { server: serverName, job: t(`job.name_${jobId}`, lang) || jobId });

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join('\n'))
        .setColor(jobId && jobs[jobId]?.color ? jobs[jobId].color : config.COLORS.INFO)
        .setThumbnail(guild.iconURL({ dynamic: true }) || null)
        .setTimestamp();

    // Footer with "Your Rank"
    let footerText = t('rank.footer', lang);
    if (authorPos > 0) {
        const authorData = topUsers[authorPos - 1];
        const val = sortBy === 'balance' ? authorData.balance.toLocaleString() : `Lvl ${authorData.level.toLocaleString()}`;
        footerText = `${t('rank.your_rank', lang, { rank: authorPos, value: val })}\n${footerText}`;
    }
    embed.setFooter({ text: footerText });

    console.log(`[TRACE][${traceId}] Leaderboard Data Ready (${Date.now() - startTime}ms)`);
    return generateUI(sortBy, jobId, lang, embed);
}
