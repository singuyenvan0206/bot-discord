const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { COLOR_INFO } = require('../../../utils/emojiHelpers');
const config = require('../../../config');

function fetchEmojiGGMemes() {
  try {
    return require('../../../data/emojigg_meme.json');
  } catch (e) {
    console.error('[Websearch] Failed to load emoji.gg Meme database:', e);
    return [];
  }
}

module.exports = {
  name: 'websearchemoji',
  aliases: ['websearchemoji'],
  description: 'Tìm kiếm emoji Meme từ Emoji.gg (Search Meme emojis from Emoji.gg)',
  async execute(message, args) {
    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'websearch') {
      commandArgs = args.slice(1);
    }

    const query = commandArgs.join(' ').trim();
    const prefix = config.PREFIX;

    if (!query) {
      throw new Error(`Usage: ${prefix}emoji websearch <query>`);
    }

    const emojis = fetchEmojiGGMemes();
    if (emojis.length === 0) {
      throw new Error('Could not load local emoji.gg database.');
    }

    const matches = emojis.filter(item => 
      item.name && item.name.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
      throw new Error(`No emoji matches found for search query: "${query}"`);
    }

    // Limit to top 25 options (Discord limit)
    const options = matches.slice(0, 25).map(m => {
      const filename = m.image_url.split('/').pop();
      return {
        label: `:${m.name.slice(0, 30)}:`,
        description: `Danh mục: ${m.category || 'Meme'}`,
        value: `${m.name.slice(0, 32)}|${filename}`
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('emoji_search_select')
      .setPlaceholder('Chọn một emoji để xem trước...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor(COLOR_INFO)
      .setTitle('🔍 Kết Quả Tìm Kiếm Emoji.gg')
      .setDescription(`Tìm thấy **${matches.length}** emoji khớp với từ khóa \`${query}\`.\nChọn một mục dưới đây để xem trước và thêm vào server.`);

    if (message.reply) {
      await message.reply({ embeds: [embed], components: [row] });
    }
    return embed;
  }
};

