const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const { createGiveawayEmbed, createEntryButton } = require('../utils/embeds');
const { isManager } = require('../utils/permissions');
const { t, getLanguage } = require('../utils/i18n');
const config = require('../config');

module.exports = {
    name: 'giveaway',
    aliases: ['g', 'gw'],
    description: 'Quản lý giveaway',
    cooldown: 5,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        if (!isManager(message.member)) {
            return message.reply(`❌ ${t('giveaway.no_permission', lang)}`);
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'start' || subcommand === 's' || subcommand === 'st') {
            // $giveaway start <time> <winners> <prize>
            const durationInput = args[1];
            const winnersInput = args[2];
            const prize = args.slice(3).join(' ');

            if (!durationInput || !winnersInput || !prize) {
                return message.reply(`❌ ${t('giveaway.usage_start', lang, { prefix: config.PREFIX })}`);
            }

            const ms = require('ms');
            const duration = ms(durationInput);
            if (!duration) return message.reply(`❌ ${t('giveaway.invalid_duration', lang)}`);

            const winnerCount = parseInt(winnersInput);
            if (isNaN(winnerCount) || winnerCount < 1) return message.reply(`❌ ${t('giveaway.invalid_winners', lang)}`);

            const endTime = Math.floor((Date.now() + duration) / 1000);

            message.delete().catch(() => { });

            // Create giveaway object for embed (matches DB column names used by embeds.js)
            const giveaway = {
                prize: prize,
                ends_at: endTime,
                winner_count: winnerCount,
                host_id: message.author.id,
                description: null,
                required_role_id: null,
                guild_id: message.guild.id,
                channel_id: message.channel.id,
                message_id: null
            };

            const embed = createGiveawayEmbed(giveaway, 0, lang);
            const sentMsg = await message.channel.send({ embeds: [embed], components: [createEntryButton(false, lang)] });
            giveaway.message_id = sentMsg.id;

            // Save to DB (matches db.createGiveaway camelCase parameter names)
            db.createGiveaway({
                messageId: sentMsg.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                prize: prize,
                winnerCount: winnerCount,
                endsAt: endTime,
                hostId: message.author.id,
            });

        } else if (subcommand === 'end' || subcommand === 'e' || subcommand === 'en') {
            const messageId = args[1];
            if (!messageId) return message.reply(`❌ ${t('giveaway.usage_end', lang, { prefix: config.PREFIX })}`);

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway || giveaway.ended) return message.reply(`❌ ${t('giveaway.not_found_or_ended', lang)}`);

            // Set end time to past so the timer picks it up and finishes it properly
            db.updateGiveaway(giveaway.message_id, { endsAt: Math.floor(Date.now() / 1000) - 1 });
            message.reply(`✅ ${t('giveaway.ending_msg', lang)}`);

        } else if (subcommand === 'reroll' || subcommand === 'r' || subcommand === 'rr') {
            const messageId = args[1];
            if (!messageId) return message.reply(`❌ ${t('giveaway.usage_reroll', lang, { prefix: config.PREFIX })}`);

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway) return message.reply(`❌ ${t('giveaway.not_found', lang)}`);
            if (!giveaway.ended) return message.reply(`❌ ${t('giveaway.not_ended', lang)}`);

            const participants = db.getParticipantUserIds(giveaway.id);
            if (participants.length === 0) return message.reply(`❌ ${t('giveaway.no_participants', lang)}`);

            const winnerId = participants[Math.floor(Math.random() * participants.length)];
            const channel = message.guild.channels.cache.get(giveaway.channel_id);
            if (channel) {
                channel.send(`🎉 **${t('giveaway.new_winner', lang)}:** <@${winnerId}>!`);
            }
            message.reply(`✅ ${t('giveaway.rerolled', lang)}`);

        } else if (subcommand === 'list' || subcommand === 'l' || subcommand === 'li') {
            const giveaways = db.getActiveGiveaways().filter(g => g.guild_id === message.guild.id);
            if (giveaways.length === 0) return message.reply(`❌ ${t('giveaway.no_active', lang)}`);

            const list = giveaways.map(g => `ID: \`${g.message_id}\` | ${t('giveaway.prize', lang)}: **${g.prize}** | ${t('giveaway.ends', lang)}: <t:${g.ends_at}:R>`).join('\n');
            message.reply(`🎉 **${t('giveaway.active_list_title', lang)}**\n${list}`);

        } else if (subcommand === 'delete' || subcommand === 'd' || subcommand === 'del') {
            const messageId = args[1];
            if (!messageId) return message.reply(`❌ ${t('giveaway.usage_delete', lang, { prefix: config.PREFIX })}`);

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway) return message.reply(`❌ ${t('giveaway.not_found', lang)}`);

            db.deleteGiveaway(giveaway.message_id);
            const channel = message.guild.channels.cache.get(giveaway.channel_id);
            if (channel) {
                channel.messages.fetch(giveaway.message_id).then(m => m.delete()).catch(() => { });
            }
            message.reply(`✅ ${t('giveaway.deleted', lang)}`);
        } else {
            message.reply(`❌ ${t('giveaway.invalid_subcommand', lang, { prefix: config.PREFIX })}`);
        }
    }
};
