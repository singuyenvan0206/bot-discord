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

const PAGE_SIZE = 10;

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

        const data = await getLeaderboardData(message.guild, sortBy, jobId, message.author.id, lang, 1);
        const replyResult = await message.reply(data);

        // replyResult may be a Message (prefix) or InteractionCallbackResponse (slash)
        // Resolve to the actual Message object in both cases
        let replyMessage = replyResult;
        if (replyResult && typeof replyResult.resource === 'object' && replyResult.resource?.message) {
            replyMessage = replyResult.resource.message;
        } else if (replyResult && typeof replyResult.fetchReply === 'function') {
            replyMessage = await replyResult.fetchReply().catch(() => null);
        }

        if (replyMessage && typeof replyMessage.createMessageComponentCollector === 'function') {
            attachRankCollector(replyMessage, message.author.id, message.guild, lang);
        }
    },

    getLeaderboardData
};

function attachRankCollector(reply, authorId, guild, lang) {
    const collector = reply.createMessageComponentCollector({
        filter: i => i.customId.startsWith('rank_') && i.user.id === authorId,
        time: 5 * 60 * 1000, // 5 minutes
    });

    collector.on('collect', async (i) => {
        try {
            const parts = i.customId.split('_');
            // Formats:
            //   rank_btn_sort_{sortBy}_{jobId}
            //   rank_btn_page_{page}_{sortBy}_{jobId}
            //   rank_menu_job_{sortBy}

            let sortBy, jobId, page;

            if (i.isStringSelectMenu()) {
                // rank_menu_job_{sortBy}
                sortBy = parts[3];
                jobId = i.values[0] === 'all' ? null : i.values[0];
                page = 1;
            } else if (parts[2] === 'sort') {
                // rank_btn_sort_{sortBy}_{jobId}
                sortBy = parts[3];
                jobId = parts[4] === 'all' ? null : parts[4];
                page = 1;
            } else if (parts[2] === 'page') {
                // rank_btn_page_{page}_{sortBy}_{jobId}
                page = parseInt(parts[3]);
                sortBy = parts[4];
                jobId = parts[5] === 'all' ? null : parts[5];
            }

            const data = await getLeaderboardData(guild, sortBy, jobId, authorId, lang, page);
            await i.update(data);
        } catch (err) {
            console.error('[Rank Collector Error]', err);
        }
    });

    collector.on('end', async () => {
        // Disable all buttons when collector expires
        try {
            const msg = await reply.fetch();
            if (!msg?.components?.length) return;
            const disabledRows = msg.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                newRow.components = newRow.components.map(c => {
                    if (c.data.type === 2) { // Button
                        return ButtonBuilder.from(c).setDisabled(true);
                    }
                    return c;
                });
                return newRow;
            });
            await reply.edit({ components: disabledRows }).catch(() => { });
        } catch (_) { }
    });
}

async function getLeaderboardData(guild, sortBy = 'xp', jobId = null, authorId = null, lang = 'vi', page = 1, traceId = 'CMD') {
    if (!guild) return { content: '❌ Command only works in a server.' };

    const startTime = Date.now();
    const jobs = config.ECONOMY.JOBS;
    const filter = jobId ? { column: 'job', value: jobId } : null;

    // Fetch ALL users (no arbitrary cap)
    const allUsers = await db.getTopUsers(guild.id, 9999, sortBy, filter);

    const totalUsers = allUsers?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
    page = Math.max(1, Math.min(page, totalPages));

    const generateUI = (currentSortBy, currentJobId, currentPage, embedData) => {
        const jobKey = currentJobId || 'all';

        // Row 1: Sort buttons + Prev/Next
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rank_btn_sort_xp_${jobKey}`)
                .setLabel(t('rank.sort_xp', lang) || 'XP')
                .setStyle(currentSortBy === 'xp' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('✨'),
            new ButtonBuilder()
                .setCustomId(`rank_btn_sort_balance_${jobKey}`)
                .setLabel(t('rank.sort_balance', lang) || 'Số dư')
                .setStyle(currentSortBy === 'balance' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji('💰'),
            new ButtonBuilder()
                .setCustomId(`rank_btn_page_${currentPage - 1}_${currentSortBy}_${jobKey}`)
                .setLabel('◀')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage <= 1),
            new ButtonBuilder()
                .setCustomId(`rank_btn_page_${currentPage + 1}_${currentSortBy}_${jobKey}`)
                .setLabel('▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages)
        );

        const jobMenu = new StringSelectMenuBuilder()
            .setCustomId(`rank_menu_job_${currentSortBy}`)
            .setPlaceholder(t('rank.select_job', lang) || 'Lọc theo nghề...')
            .addOptions([
                { label: t('rank.all_jobs', lang) || 'Tất cả', value: 'all', emoji: '🏆', default: !currentJobId },
                ...Object.values(jobs).map(j => ({
                    label: t(`job.name_${j.id}`, lang) || j.id,
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

    if (!allUsers || allUsers.length === 0) {
        return generateUI(sortBy, jobId, 1, emptyEmbed);
    }

    // Get the slice for current page
    const pageUsers = allUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Determine author's global rank
    let authorPos = -1;
    if (authorId) {
        authorPos = allUsers.findIndex(u => u.id === authorId) + 1;
    }

    // Fetch discord members for this page + author
    const userIds = [...new Set(pageUsers.map(u => u.id))];
    if (authorId) userIds.push(authorId);

    const members = await guild.members.fetch({ user: userIds, withPresences: false }).catch(err => {
        console.error(`[Leaderboard Fetch Error]:`, err);
        return new Map();
    });

    const lines = [];
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < pageUsers.length; i++) {
        const u = pageUsers[i];
        const globalPos = (page - 1) * PAGE_SIZE + i + 1;
        const member = members.get(u.id);
        const username = member ? member.user.username : (u.id === authorId ? 'Bạn' : `Unknown`);

        const rankLabel = globalPos <= 3 ? medals[globalPos - 1] : `**${globalPos}.**`;
        const isAuthor = u.id === authorId ? ` **(${t('rank.you', lang) || 'Bạn'})**` : '';
        const jobDisplay = u.job && !jobId ? ` | ${t(`job.name_${u.job}`, lang) || u.job}` : '';

        const valueDisplay = sortBy === 'balance'
            ? `${config.EMOJIS.COIN} **${(u.balance || 0).toLocaleString()}**`
            : `${t('profile.level_label', lang) || 'Level'} **${(u.level || 0).toLocaleString()}**`;

        lines.push(`${rankLabel} ${username} — ${valueDisplay}${jobDisplay}${isAuthor}`);
    }

    if (lines.length === 0) {
        return generateUI(sortBy, jobId, page, emptyEmbed);
    }

    const serverName = guild.name || 'Server';
    let title = sortBy === 'balance'
        ? t('rank.leaderboard_balance_title', lang, { server: serverName })
        : t('rank.leaderboard_title', lang, { server: serverName });
    if (jobId) title = t('rank.leaderboard_job_title', lang, { server: serverName, job: t(`job.name_${jobId}`, lang) || jobId });

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join('\n'))
        .setColor(jobId && jobs[jobId]?.color ? jobs[jobId].color : config.COLORS.INFO)
        .setThumbnail(guild.iconURL({ dynamic: true }) || null)
        .setTimestamp();

    // Footer: page info + your rank
    let footerText = `📄 Trang ${page}/${totalPages} • ${totalUsers} người`;
    if (authorPos > 0) {
        const authorData = allUsers[authorPos - 1];
        const val = sortBy === 'balance' ? authorData.balance.toLocaleString() : `Lvl ${authorData.level.toLocaleString()}`;
        footerText = `${t('rank.your_rank', lang, { rank: authorPos, value: val })}\n${footerText}`;
    }
    if (t('rank.footer', lang)) footerText += `\n${t('rank.footer', lang)}`;
    embed.setFooter({ text: footerText });

    console.log(`[TRACE][${traceId}] Leaderboard Page ${page}/${totalPages} (${totalUsers} users, ${Date.now() - startTime}ms)`);
    return generateUI(sortBy, jobId, page, embed);
}
