const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../../database');
const { runStickerAutoSuggestForGuild } = require('../../../utils/scheduler');

module.exports = {
  name: 'autosuggeststicker',
  aliases: ['autosuggeststicker'],
  description: 'Gửi đề xuất sticker thịnh hành ngay lập tức (Trigger trending sticker suggestion)',
  async execute(message, args) {
    const isBotOwner = await db.isOwner(message.author.id);
    if (!isBotOwner && !message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      throw new Error('You need the Manage Emojis and Stickers permission to use this command.');
    }

    const guild = message.guild;

    // Immediately trigger trending suggest for this guild
    const suggested = await runStickerAutoSuggestForGuild(guild, []);

    if (!suggested) {
      throw new Error('No new sticker suggestion could be generated at this time.');
    }

    const isPlainObject = message.constructor && message.constructor.name === 'Object';
    if (message.reply) {
      if (!isPlainObject) {
        await message.react('✅').catch(() => {});
      } else {
        await message.reply({
          content: `✅ Đã gửi gợi ý sticker **${suggested.name}** vào kênh bình chọn thành công!`,
          flags: [64] // Ephemeral
        });
      }
    }
  }
};
