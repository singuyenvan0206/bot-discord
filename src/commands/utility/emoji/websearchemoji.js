const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { COLOR_INFO } = require('../../../utils/emojiHelpers');
const axios = require('axios');
const config = require('../../../config');

async function fetchSlackmojisList() {
  try {
    const response = await axios.get('https://slackmojis.com/emojis.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
  } catch (err) {
    console.warn('[Websearch] Live auto-suggest fetch failed, using offline fallback:', err.message);
  }
  try {
    return require('../../../data/slackmojis.json');
  } catch (e) {
    return [];
  }
}

module.exports = {
  name: 'websearchemoji',
  aliases: ['websearchemoji'],
  description: 'Tìm kiếm emoji trực tuyến từ Slackmojis (Search the web dynamically for new emojis)',
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

    const slackmojis = await fetchSlackmojisList();
    if (slackmojis.length === 0) {
      throw new Error('Could not load online or local emoji databases.');
    }

    const matches = slackmojis.filter(item => 
      item.name && item.name.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
      throw new Error(`No emoji matches found for search query: "${query}"`);
    }

    // Limit to top 25 options (Discord limit)
    const options = matches.slice(0, 25).map(m => {
      const relativePath = m.image_url.split('/images/')[1];
      return {
        label: `:${m.name.slice(0, 30)}:`,
        description: `Danh mục: ${(m.category?.name || 'Meme').slice(0, 50)}`,
        value: `${m.name.slice(0, 32)}|${relativePath}`
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('emoji_search_select')
      .setPlaceholder('Chọn một emoji trực tuyến để xem trước...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor(COLOR_INFO)
      .setTitle('🔍 Kết Quả Tìm Kiếm Trực Tuyến')
      .setDescription(`Tìm thấy **${matches.length}** emoji khớp với từ khóa \`${query}\`.\nChọn một mục dưới đây để xem trước và thêm vào server.`);

    if (message.reply) {
      await message.reply({ embeds: [embed], components: [row] });
    }
    return embed;
  }
};
