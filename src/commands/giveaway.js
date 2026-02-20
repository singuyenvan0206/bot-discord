const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const { createGiveawayEmbed, createEntryButton } = require('../utils/embeds');

module.exports = {
    name: 'giveaway',
    aliases: ['g'],
    description: 'Manage giveaways',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && !db.isOwner(message.author.id)) {
            return message.reply('❌ You do not have permission to manage giveaways.');
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'start') {
            // $giveaway start <time> <winners> <prize>
            const durationInput = args[1];
            const winnersInput = args[2];
            const prize = args.slice(3).join(' ');

            if (!durationInput || !winnersInput || !prize) {
                return message.reply('❌ Usage: `$giveaway start <time> <winners> <prize>`\nExample: `$giveaway start 10m 1 Nitro`');
            }

            const ms = require('ms');
            const duration = ms(durationInput);
            if (!duration) return message.reply('❌ Invalid duration format (e.g., 10m, 1h, 1d).');

            const winnerCount = parseInt(winnersInput);
            if (isNaN(winnerCount) || winnerCount < 1) return message.reply('❌ Invalid winner count.');

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

            const embed = createGiveawayEmbed(giveaway, 0);
            const sentMsg = await message.channel.send({ embeds: [embed], components: [createEntryButton()] });
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

        } else if (subcommand === 'end') {
            const messageId = args[1];
            if (!messageId) return message.reply('❌ Usage: `$giveaway end <message_id>`');

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway || giveaway.ended) return message.reply('❌ Giveaway not found or already ended.');

            // Set end time to past so the timer picks it up and finishes it properly
            db.updateGiveaway(giveaway.message_id, { endsAt: Math.floor(Date.now() / 1000) - 1 });
            message.reply('✅ Giveaway set to end immediately. Winners will be picked shortly.');

        } else if (subcommand === 'reroll') {
            const messageId = args[1];
            if (!messageId) return message.reply('❌ Usage: `$giveaway reroll <message_id>`');

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway) return message.reply('❌ Giveaway not found.');
            if (!giveaway.ended) return message.reply('❌ Giveaway has not ended yet.');

            const participants = db.getParticipantUserIds(giveaway.id);
            if (participants.length === 0) return message.reply('❌ No participants.');

            const winnerId = participants[Math.floor(Math.random() * participants.length)];
            const channel = message.guild.channels.cache.get(giveaway.channel_id);
            if (channel) {
                channel.send(`🎉 **New Winner:** <@${winnerId}>! (Reroll)`);
            }
            message.reply('✅ Rerolled!');

        } else if (subcommand === 'list') {
            const giveaways = db.getActiveGiveaways().filter(g => g.guild_id === message.guild.id);
            if (giveaways.length === 0) return message.reply('❌ No active giveaways.');

            const list = giveaways.map(g => `ID: \`${g.message_id}\` | Prize: **${g.prize}** | Ends: <t:${g.ends_at}:R>`).join('\n');
            message.reply(`🎉 **Active Giveaways**\n${list}`);

        } else if (subcommand === 'delete') {
            const messageId = args[1];
            if (!messageId) return message.reply('❌ Usage: `$giveaway delete <message_id>`');

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway) return message.reply('❌ Giveaway not found.');

            db.deleteGiveaway(giveaway.message_id);
            const channel = message.guild.channels.cache.get(giveaway.channel_id);
            if (channel) {
                channel.messages.fetch(giveaway.message_id).then(m => m.delete()).catch(() => { });
            }
            message.reply('✅ Giveaway deleted.');
        } else {
            message.reply('❌ Unknown subcommand. Usage: `$giveaway <start|end|reroll|list|delete>`');
        }
    }
};
