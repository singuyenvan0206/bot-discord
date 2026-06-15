const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { COLOR_SUCCESS } = require('../../../utils/emojiHelpers');
const { runAutoSuggestForGuild } = require('../../../utils/scheduler');
const db = require('../../../database');

module.exports = {
  name: 'autosuggestemoji',
  aliases: ['autosuggestemoji'],
  description: 'Gửi đề xuất emoji thịnh hành ngay lập tức (Trigger trending emoji suggestion)',
  async execute(message, args) {
    const isBotOwner = await db.isOwner(message.author.id);
    if (!isBotOwner && !message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      throw new Error('You need the Manage Expressions permission to use this command.');
    }

    const guild = message.guild;

    // Immediately trigger trending suggest for this guild
    const suggested = await runAutoSuggestForGuild(guild, []);

    if (!suggested) {
      throw new Error('No new emoji suggestion could be generated at this time.');
    }

    const isPlainObject = message.constructor && message.constructor.name === 'Object';
    if (message.reply) {
      if (!isPlainObject) {
        await message.react('✅').catch(() => {});
      } else {
        await message.reply({
          content: `✅ Đã gửi gợi ý emoji **:${suggested.name}:** vào kênh bình chọn thành công!`,
          flags: [64] // Ephemeral
        });
      }
    }
  }
};
