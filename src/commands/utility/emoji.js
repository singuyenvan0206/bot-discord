const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { COLOR_INFO, COLOR_ERROR } = require('../../utils/emojiHelpers');
const { handleSuggest } = require('./emoji/suggestemoji');

function handleHelp(prefix) {
  return new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle('💡 Emoji Suggestion & Config Help Guide')
    .setDescription('Manage your server emoji configurations and suggestions with slash-style or prefix commands. Use the commands below with your configured prefix: ' + prefix + '.')
    .addFields(
      {
        name: '💡 Suggest Emoji',
        value: '* **Slash:** /emoji suggest name: <name> url: <emoji_or_url>\n* **Prefix:** ' + prefix + 'emoji suggest <name> <emoji_or_url> or upload an attachment and use ' + prefix + 'emoji suggest <name>\n* **Shortcut:** ' + prefix + 'suggestemoji <name> <emoji_or_url>\n*Submits a suggestion to the emoji suggestion channel.',
        inline: false
      },
      {
        name: '🥷 Steal Emoji',
        value: '* **Slash:** /emoji steal emoji_or_message: <emoji_or_message_url>\n* **Prefix:** ' + prefix + 'emoji steal <emoji_or_message_url> or ' + prefix + 'emoji steal <name> <emoji_or_message_url>\n* **Shortcut:** ' + prefix + 'stealemoji <emoji_or_message_url>\n*Non-admins will suggest a steal if they lack Manage Expressions permissions.',
        inline: false
      }
    )
    .setFooter({ text: 'Note: Users need the Manage Expressions (or Manage Emojis and Stickers) permission to manage admin emoji config commands.' });
}

module.exports = {
  name: 'emoji',
  description: 'Quản lý đề xuất và cấu hình emoji của server (Manage guild emoji configs & suggestions)',
  subcommands: {
    'suggest <name> <url>': 'Đề xuất emoji mới vào kênh bình chọn.',
    'steal <emoji_or_url>': 'Ăn trộm emoji từ server khác hoặc đề xuất nếu thiếu quyền.',
    'config [channel] [approve] [reject] ...': 'Cài đặt đề xuất và dọn dẹp emoji.',
    'search <query>': 'Tìm kiếm emoji từ danh mục local.',
    'inactive [minUses] [inactiveDays]': 'Hiển thị danh sách emoji ít hoạt động.',
    'prune [minUses] [inactiveDays]': 'Dọn dẹp (xóa) emoji ít sử dụng.',
    'websearch <query>': 'Tìm kiếm emoji trực tuyến từ Slackmojis.',
    'autosuggest': 'Gửi đề xuất emoji thịnh hành ngay lập tức.',
    'usage [page]': 'Xem thống kê số lần sử dụng của từng emoji trên server.',
    'delete <name_or_id_list>': 'Xóa hoặc xóa hàng loạt emoji bằng tên hoặc ID.'
  },

  handleSuggest,

  async execute(message, args) {
    const guildRow = message.guild ? await db.getGuild(message.guild.id) : null;
    const prefix = guildRow?.prefix || config.PREFIX;

    let invokedCommand = '';
    if (message.content.startsWith(prefix)) {
      const contentWithoutPrefix = message.content.slice(prefix.length).trim();
      invokedCommand = contentWithoutPrefix.split(/ +/)[0]?.toLowerCase() || '';
    } else if (message.content.startsWith('$')) {
      const contentWithoutPrefix = message.content.slice(1).trim();
      invokedCommand = contentWithoutPrefix.split(/ +/)[0]?.toLowerCase() || '';
    }

    const subcommand = args[0]?.toLowerCase();

    // Check for help command or empty subcommand
    if (!subcommand || subcommand === 'help') {
      const helpEmbed = handleHelp(prefix);
      return message.reply({ embeds: [helpEmbed] });
    }

    // Routing subcommands
    try {
      if (message.channel && typeof message.channel.sendTyping === 'function') {
        await message.channel.sendTyping().catch(() => {});
      }

      switch (subcommand) {
        case 'suggest':
          return await require('./emoji/suggestemoji').execute(message, args);
        case 'steal':
          return await require('./emoji/stealemoji').execute(message, args);
        case 'config':
          return await require('./emoji/configemoji').execute(message, args);
        case 'search':
          return await require('./emoji/searchemoji').execute(message, args);
        case 'inactive':
          return await require('./emoji/inactiveemoji').execute(message, args);
        case 'prune':
          return await require('./emoji/pruneemoji').execute(message, args);
        case 'websearch':
          return await require('./emoji/websearchemoji').execute(message, args);
        case 'autosuggest':
          return await require('./emoji/autosuggestemoji').execute(message, args);
        case 'usage':
        case 'stats':
          return await require('./emoji/usageemoji').execute(message, args);
        case 'delete':
          return await require('./emoji/deleteemoji').execute(message, args);
        default:
          throw new Error('Unknown subcommand ' + subcommand + '. Type ' + prefix + 'emoji for help.');
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
