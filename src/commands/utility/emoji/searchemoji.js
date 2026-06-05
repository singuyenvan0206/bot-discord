const { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { COLOR_INFO } = require('../../../utils/emojiHelpers');
const config = require('../../../config');

module.exports = {
  name: 'searchemoji',
  aliases: ['searchemoji'],
  description: 'Tìm kiếm emoji từ danh mục local (Search the local emoji mirror catalog)',
  async execute(message, args) {
    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'search') {
      commandArgs = args.slice(1);
    }

    const query = commandArgs.join(' ').trim();
    const prefix = config.PREFIX;

    if (!query) {
      throw new Error(`Usage: ${prefix}emoji search <query>`);
    }

    let slackmojis = [];
    try {
      slackmojis = require('../../../data/slackmojis.json');
    } catch (err) {
      throw new Error('Could not load local emoji catalog database.');
    }

    const matches = slackmojis.filter(item => 
      item.name && item.name.toLowerCase().includes(query.toLowerCase())
    );

    if (matches.length === 0) {
      throw new Error(`No local emoji matches found for search query: "${query}"`);
    }

    // Limit to top 25 options (Discord limit)
    const options = matches.slice(0, 25).map(m => {
      // Relative path: target.image_url.split('/images/')[1]
      const relativePath = m.image_url.split('/images/')[1];
      return {
        label: `:${m.name.slice(0, 30)}:`,
        description: `Danh mục: ${(m.category?.name || 'Meme').slice(0, 50)}`,
        value: `${m.name.slice(0, 32)}|${relativePath}`
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('emoji_search_select')
      .setPlaceholder('Chọn một emoji để xem trước...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor(COLOR_INFO)
      .setTitle('🔍 Kết Quả Tìm Kiếm Emoji')
      .setDescription(`Tìm thấy **${matches.length}** emoji khớp với từ khóa \`${query}\`.\nChọn một mục dưới đây để xem trước và thêm vào server.`);

    if (message.reply) {
      await message.reply({ embeds: [embed], components: [row] });
    }
    return embed;
  }
};
