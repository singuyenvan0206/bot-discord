const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLOR_SUCCESS, COLOR_ERROR } = require('../../../utils/emojiHelpers');
const db = require('../../../database');
const config = require('../../../config');

module.exports = {
  name: 'deletesticker',
  aliases: ['deletesticker'],
  description: 'Xóa sticker tùy chỉnh khỏi server (Delete custom stickers from the server)',
  async execute(message, args) {
    const isBotOwner = await db.isOwner(message.author.id);
    if (!isBotOwner && !message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      throw new Error('You need the Manage Emojis and Stickers permission to use this command.');
    }

    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'delete') {
      commandArgs = args.slice(1);
    }

    const prefix = config.PREFIX;
    if (commandArgs.length === 0) {
      throw new Error(`Usage: \`${prefix}sticker delete <name_or_id_list>\` (separated by space or comma)`);
    }

    const guild = message.guild;
    const input = commandArgs.join(' ');
    // Split by comma or whitespace
    const targets = input.split(/[\s,]+/).filter(x => x.trim() !== '');

    const guildStickers = await guild.stickers.fetch();

    const success = [];
    const failed = [];

    for (const query of targets) {
      const sticker = guildStickers.get(query) || guildStickers.find(s => s.name.toLowerCase() === query.toLowerCase());
      if (sticker) {
        try {
          const name = sticker.name;
          const id = sticker.id;
          await sticker.delete();
          // Clear stats from DB
          await db.clearEmojiStats(guild.id, id).catch(() => {});
          success.push(`\`${name}\` (ID: \`${id}\`)`);
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
        .setTitle('✅ Đã Xóa Sticker Thành Công')
        .addFields({ name: 'Sticker đã xóa', value: success.join('\n') });
    } else {
      embed.setColor(COLOR_ERROR)
        .setTitle('❌ Xóa Sticker Thất Bại');
    }

    if (failed.length > 0) {
      embed.addFields({ name: 'Thất bại / Không tìm thấy', value: failed.join('\n') });
    }

    if (message.reply) {
      await message.reply({ embeds: [embed] });
    }
  }
};
