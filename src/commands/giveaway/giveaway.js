const db = require('../../database');
const config = require('../../config');
const ms = require('ms');
const { createGiveawayEmbed, createEntryButton } = require('../../utils/embeds');
const { isManager } = require('../../utils/permissions');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'giveaway',
    aliases: ['ga', 'gw'],
    description: 'Quản lý sự kiện giveaway.',
    cooldown: 5,
    subcommands: {
        'start <time> <winners> <prize>': 'Bắt đầu một giveaway mới.',
        'end <message_id>': 'Kết thúc một giveaway đang diễn ra sớm.',
        'reroll <message_id>': 'Chọn lại người chiến thắng.',
        'list': 'Xem danh sách các giveaway đang diễn ra.',
        'delete <message_id>': 'Hủy và xóa một giveaway.'
    },

    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        if (!(await isManager(message.member))) {
            return message.reply(`❌ ${t('giveaway.no_permission', lang)}`);
        }

        const subcommand = args[0]?.toLowerCase();

        /* ================= START ================= */

        if (['start', 's', 'st', 'str'].includes(subcommand)) {
            const durationInput = args[1];
            const winnersInput = args[2];
            const prize = args.slice(3).join(' ');

            if (!durationInput || !winnersInput || !prize) {
                return message.reply(`❌ ${t('giveaway.usage_start', lang, { prefix: config.PREFIX })}`);
            }

            const duration = ms(durationInput);
            if (!duration) {
                return message.reply(`❌ ${t('giveaway.invalid_duration', lang)}`);
            }

            const winnerCount = parseInt(winnersInput);
            if (isNaN(winnerCount) || winnerCount < 1) {
                return message.reply(`❌ ${t('giveaway.invalid_winners', lang)}`);
            }

            if (!message.channel?.isTextBased?.() || message.channel.isDMBased?.()) {
                return message.reply(`❌ ${t('giveaway.channel_not_text', lang)}`);
            }

            const endTime = Math.floor((Date.now() + duration) / 1000);
            const channel = message.channel;

            const giveaway = {
                prize: prize,
                ends_at: endTime,
                winner_count: winnerCount,
                host_id: message.author.id,
                description: null,
                required_role_id: null,
                guild_id: message.guild.id,
                channel_id: channel.id,
                message_id: null
            };

            const embed = createGiveawayEmbed(giveaway, 0, lang);

            try {
                const sentMsg = await channel.send({
                    embeds: [embed],
                    components: [createEntryButton(false, lang)]
                });

                await db.createGiveaway({
                    messageId: sentMsg.id,
                    channelId: channel.id,
                    guildId: message.guild.id,
                    prize: prize,
                    winnerCount: winnerCount,
                    endsAt: endTime,
                    hostId: message.author.id,
                });

                message.delete().catch(() => { });
            } catch (err) {
                console.error('[Giveaway] Send failed:', err);
                return message.reply(`❌ ${t('giveaway.send_failed', lang)}`);
            }

            return;
        }

        /* ================= END ================= */

        if (['end', 'e', 'en'].includes(subcommand)) {
            const messageId = args[1];
            if (!messageId) {
                return message.reply(`❌ ${t('giveaway.usage_end', lang, { prefix: config.PREFIX })}`);
            }

            const giveaway = await db.getGiveaway(messageId);
            if (!giveaway || giveaway.ended) {
                return message.reply(`❌ ${t('giveaway.not_found_or_ended', lang)}`);
            }

            await db.updateGiveaway(giveaway.message_id, {
                endsAt: Math.floor(Date.now() / 1000) - 1
            });

            return message.reply(`✅ ${t('giveaway.ending_msg', lang)}`);
        }

        /* ================= REROLL ================= */

        if (['reroll', 'r', 'rr'].includes(subcommand)) {
            const messageId = args[1];
            if (!messageId) {
                return message.reply(`❌ ${t('giveaway.usage_reroll', lang, { prefix: config.PREFIX })}`);
            }

            const giveaway = await db.getGiveaway(messageId);
            if (!giveaway) {
                return message.reply(`❌ ${t('giveaway.not_found', lang)}`);
            }

            if (!giveaway.ended) {
                return message.reply(`❌ ${t('giveaway.not_ended', lang)}`);
            }

            const winnersList = require('../../utils/timer').pickWinners(await db.getParticipants(giveaway.id), giveaway.winner_count);

            if (!winnersList.length) {
                return message.reply(`❌ ${t('giveaway.no_participants', lang)}`);
            }

            const winnerId = winnersList[0];

            const channel = message.guild.channels.cache.get(giveaway.channel_id);
            if (channel) {
                channel.send(`🎉 **${t('giveaway.new_winner', lang)}:** <@${winnerId}>!`);
            }

            return message.reply(`✅ ${t('giveaway.rerolled', lang)}`);
        }

        /* ================= LIST ================= */

        if (['list', 'l', 'li'].includes(subcommand)) {
            const giveaways = await db.getActiveGiveaways(message.guild.id);

            if (!giveaways.length) {
                return message.reply(`❌ ${t('giveaway.no_active', lang)}`);
            }

            const list = giveaways.map(g => {
                const prizeDisplay = isNaN(Number(g.prize)) ? g.prize : Number(g.prize).toLocaleString();
                return `ID: \`${g.message_id}\` | ${t('giveaway.prize', lang)}: **${prizeDisplay}** | ${t('giveaway.ends', lang)}: <t:${g.ends_at}:R>`;
            }).join('\n');

            return message.reply(`🎉 **${t('giveaway.active_list_title', lang)}**\n${list}`);
        }

        /* ================= DELETE ================= */

        if (['delete', 'd', 'del'].includes(subcommand)) {
            const messageId = args[1];
            if (!messageId) {
                return message.reply(`❌ ${t('giveaway.usage_delete', lang, { prefix: config.PREFIX })}`);
            }

            const giveaway = await db.getGiveaway(messageId);
            if (!giveaway) {
                return message.reply(`❌ ${t('giveaway.not_found', lang)}`);
            }

            await db.deleteGiveaway(giveaway.message_id);

            const channel = message.guild.channels.cache.get(giveaway.channel_id);
            if (channel) {
                channel.messages.fetch(giveaway.message_id)
                    .then(m => m.delete())
                    .catch(() => { });
            }

            return message.reply(`✅ ${t('giveaway.deleted', lang)}`);
        }

        /* ================= INVALID ================= */

        return message.reply(`❌ ${t('giveaway.invalid_subcommand', lang, { prefix: config.PREFIX })}`);
    }
};