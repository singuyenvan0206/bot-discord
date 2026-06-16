const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLOR_SUCCESS, COLOR_ERROR } = require('../../../utils/emojiHelpers');
const db = require('../../../database');
const config = require('../../../config');

module.exports = {
  name: 'deleteemoji',
  aliases: ['deleteemoji'],
  description: 'Xóa emoji tùy chỉnh khỏi server (Delete custom emojis from the server)',
  async execute(message, args) {
    const isBotOwner = await db.isOwner(message.author.id);
    if (!isBotOwner && !message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      throw new Error('You need the Manage Expressions permission to use this command.');
    }

    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'delete') {
      commandArgs = args.slice(1);
    }

    const prefix = config.PREFIX;
    if (commandArgs.length === 0) {
      throw new Error(`Usage: \`${prefix}emoji delete <name_or_id_list>\` (separated by space or comma)`);
    }

    const guild = message.guild;
    const input = commandArgs.join(' ');
    // Split by comma or whitespace
    const targets = input.split(/[\s,]+/).filter(x => x.trim() !== '');

    const guildEmojis = await guild.emojis.fetch();

    const success = [];
    const failed = [];

    for (const query of targets) {
      // Clean query if it is raw custom emoji tag like <:name:id> or <a:name:id>
      let cleanQuery = query;
      const emojiMatch = query.match(/<a?:\w+:(\d+)>/);
      if (emojiMatch) {
        cleanQuery = emojiMatch[1];
      }

      const emoji = guildEmojis.get(cleanQuery) || guildEmojis.find(e => e.name.toLowerCase() === cleanQuery.toLowerCase());
      if (emoji) {
        try {
          const name = emoji.name;
          const id = emoji.id;
          await emoji.delete();
          // Clear stats from DB
          await db.clearEmojiStats(guild.id, id).catch(() => {});
          success.push(`:${name}: (ID: \`${id}\`)`);
        } catch (err) {
          failed.push(`\`${query}\` (Lỗi: ${err.message})`);
        }
      } else {
        failed.push(`\`${query}\` (Không tìm thấy)`);
      }
    }

    const embed = new EmbedBuilder();
    if (success.length > 0) {
      embed.setColor(COLOR_SUCCESS)
        .setTitle('✅ Đã Xóa Emoji Thành Công')
        .addFields({ name: 'Emoji đã xóa', value: success.join('\n') });
    } else {
      embed.setColor(COLOR_ERROR)
        .setTitle('❌ Xóa Emoji Thất Bại');
    }

    if (failed.length > 0) {
      embed.addFields({ name: 'Thất bại / Không tìm thấy', value: failed.join('\n') });
    }

    if (message.reply) {
      await message.reply({ embeds: [embed] });
    }
  }
};
