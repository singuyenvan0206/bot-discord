const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const { createGiveawayEmbed, createEntryButton } = require('../utils/embeds');
const { isManager } = require('../utils/permissions');

module.exports = {
    name: 'giveaway',
    aliases: ['g'],
    description: 'Quản lý sự kiện tặng quà (Giveaway)',
    async execute(message, args) {
        if (!isManager(message.member)) {
            return message.reply('❌ Bạn không có quyền quản lý giveaway.');
        }

        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'start') {
            // $giveaway start <time> <winners> <prize>
            const durationInput = args[1];
            const winnersInput = args[2];
            const prize = args.slice(3).join(' ');

            if (!durationInput || !winnersInput || !prize) {
                return message.reply(`❌ Cách dùng: \`${config.PREFIX}giveaway start <thời_gian> <số_người_thắng> <phần_thưởng>\`\nVí dụ: \`${config.PREFIX}giveaway start 10m 1 Nitro\``);
            }

            const ms = require('ms');
            const duration = ms(durationInput);
            if (!duration) return message.reply('❌ Định dạng thời gian không hợp lệ (vđ: 10m, 1h, 1d).');

            const winnerCount = parseInt(winnersInput);
            if (isNaN(winnerCount) || winnerCount < 1) return message.reply('❌ Số lượng người thắng không hợp lệ.');

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
            if (!messageId) return message.reply(`❌ Cách dùng: \`${config.PREFIX}giveaway end <message_id>\``);

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway || giveaway.ended) return message.reply('❌ Không tìm thấy giveaway hoặc sự kiện đã kết thúc.');

            // Set end time to past so the timer picks it up and finishes it properly
            db.updateGiveaway(giveaway.message_id, { endsAt: Math.floor(Date.now() / 1000) - 1 });
            message.reply('✅ Giveaway đã được đặt để kết thúc ngay lập tức. Người thắng sẽ được chọn sớm.');

        } else if (subcommand === 'reroll') {
            const messageId = args[1];
            if (!messageId) return message.reply(`❌ Cách dùng: \`${config.PREFIX}giveaway reroll <message_id>\``);

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway) return message.reply('❌ Không tìm thấy giveaway.');
            if (!giveaway.ended) return message.reply('❌ Sự kiện này vẫn chưa kết thúc.');

            const participants = db.getParticipantUserIds(giveaway.id);
            if (participants.length === 0) return message.reply('❌ Không có người tham gia.');

            const winnerId = participants[Math.floor(Math.random() * participants.length)];
            const channel = message.guild.channels.cache.get(giveaway.channel_id);
            if (channel) {
                channel.send(`🎉 **Người thắng mới:** <@${winnerId}>! (Quay lại)`);
            }
            message.reply('✅ Đã quay lại người thắng mới!');

        } else if (subcommand === 'list') {
            const giveaways = db.getActiveGiveaways().filter(g => g.guild_id === message.guild.id);
            if (giveaways.length === 0) return message.reply('❌ Không có giveaway nào đang diễn ra.');

            const list = giveaways.map(g => `ID: \`${g.message_id}\` | Phần thưởng: **${g.prize}** | Kết thúc: <t:${g.ends_at}:R>`).join('\n');
            message.reply(`🎉 **Các sự kiện Giveaway đang diễn ra**\n${list}`);

        } else if (subcommand === 'delete') {
            const messageId = args[1];
            if (!messageId) return message.reply(`❌ Cách dùng: \`${config.PREFIX}giveaway delete <message_id>\``);

            const giveaway = db.getGiveaway(messageId);
            if (!giveaway) return message.reply('❌ Không tìm thấy giveaway.');

            db.deleteGiveaway(giveaway.message_id);
            const channel = message.guild.channels.cache.get(giveaway.channel_id);
            if (channel) {
                channel.messages.fetch(giveaway.message_id).then(m => m.delete()).catch(() => { });
            }
            message.reply('✅ Đã xóa giveaway.');
        } else {
            message.reply(`❌ Lệnh không hợp lệ. Cách dùng: \`${config.PREFIX}giveaway <start|end|reroll|list|delete>\``);
        }
    }
};
