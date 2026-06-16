const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { COLOR_INFO, COLOR_ERROR } = require('../../utils/emojiHelpers');

function handleHelp(prefix) {
  return new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle('🏷️ Sticker Management Help Guide')
    .setDescription('Manage your server custom stickers. Use the commands below with your configured prefix: ' + prefix + '.')
    .addFields(
      {
        name: '🏷️ Suggest Sticker',
        value: '* **Slash:** `/sticker suggest name: <name> tags: <tags> [url] [file]`\n* **Prefix:** `' + prefix + 'sticker suggest <name> <tags> <url>` or upload an attachment and use `' + prefix + 'sticker suggest <name> <tags>`\n*Submits a suggestion to the suggestion channel.',
        inline: false
      },
      {
        name: '🥷 Steal Sticker',
        value: '* **Slash:** `/sticker steal [message_url] [name] [tags]`\n* **Prefix:** `' + prefix + 'sticker steal [message_url] [name] [tags]` or reply to a message containing a sticker with `' + prefix + 'sticker steal [name] [tags]`\n*Admins can steal directly, non-admins will submit a suggestion.',
        inline: false
      },
      {
        name: '⚙️ Config Sticker',
        value: '* **Prefix:** `' + prefix + 'sticker config` to view settings, or `' + prefix + 'sticker config <key> <value>` to update (e.g. `channel`, `approve`, `reject`, `auto_suggest`).',
        inline: false
      },
      {
        name: '🗑️ Delete Sticker',
        value: '* **Prefix:** `' + prefix + 'sticker delete <name_or_id_list>`\n* **Slash:** `/sticker delete stickers: <name_or_id_list>`\n*Bulk deletes stickers separated by spaces or commas (Admin only).',
        inline: false
      }
    )
    .setFooter({ text: 'Note: Users need the Manage Emojis and Stickers permission to manage admin configurations and deletion.' });
}

module.exports = {
  name: 'sticker',
  aliases: ['sticker', 'stickers'],
  description: 'Quản lý đề xuất, cấu hình và xóa sticker (Manage guild stickers & suggestion settings)',
  subcommands: {
    'suggest <name> <tags> [url]': 'Đề xuất sticker mới vào kênh bình chọn.',
    'steal [message_url]': 'Ăn trộm sticker từ tin nhắn khác hoặc đề xuất nếu thiếu quyền.',
    'config [key] [value]': 'Cài đặt đề xuất sticker (kênh, nút duyệt, tự động đề xuất).',
    'usage [page]': 'Xem thống kê số lần sử dụng của từng sticker.',
    'delete <name_or_id_list>': 'Xóa hoặc xóa hàng loạt sticker bằng tên hoặc ID.',
    'autosuggest': 'Gửi đề xuất sticker ngẫu nhiên ngay lập tức.'
  },

  async execute(message, args) {
    const guildRow = message.guild ? await db.getGuild(message.guild.id) : null;
    const prefix = guildRow?.prefix || config.PREFIX;
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'help') {
      const helpEmbed = handleHelp(prefix);
      return message.reply({ embeds: [helpEmbed] });
    }

    try {
      if (message.channel && typeof message.channel.sendTyping === 'function') {
        await message.channel.sendTyping().catch(() => {});
      }

      switch (subcommand) {
        case 'suggest':
          return await require('./sticker/suggeststicker').execute(message, args);
        case 'steal':
          return await require('./sticker/stealsticker').execute(message, args);
        case 'config':
          return await require('./sticker/configsticker').execute(message, args);
        case 'usage':
        case 'stats':
          return await require('./sticker/usagesticker').execute(message, args);
        case 'delete':
          return await require('./sticker/deletesticker').execute(message, args);
        case 'autosuggest':
          return await require('./sticker/autosuggeststicker').execute(message, args);
        default:
          throw new Error('Unknown subcommand ' + subcommand + '. Type ' + prefix + 'sticker for help.');
      }
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor(COLOR_ERROR)
        .setTitle('❌ Error')
        .setDescription(error.message);
      await message.reply({ embeds: [errorEmbed] });
    }
  }
};
