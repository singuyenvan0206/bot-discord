const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
  name: 'personality',
  aliases: ['botchar', 'mood'],
  description: 'Thiết lập nhân cách AI cho bot (Set AI personality for the bot)',
  adminOnly: true,
  usage: '[default | tsundere | toxic_gamer | helpful_assistant | philosopher]',
  async execute(message, args) {
    const lang = await getLanguage(message.author.id, message.guild?.id);
    const prefix = config.PREFIX;

    const validPersonalities = ['default', 'tsundere', 'toxic_gamer', 'helpful_assistant', 'philosopher'];
    const newPersonality = args[0]?.toLowerCase();

    if (!newPersonality || !validPersonalities.includes(newPersonality)) {
      const embed = new EmbedBuilder()
        .setTitle('🎭 AI Personality')
        .setDescription(`Vui lòng chọn một nhân cách hợp lệ:\n\n` + 
          `• \`default\`: Thân thiện, hữu ích\n` +
          `• \`tsundere\`: Nắng mưa, hay mắng mỏ\n` +
          `• \`toxic_gamer\`: Game thủ cà khịa\n` +
          `• \`helpful_assistant\`: Tận tâm, lịch sự\n` +
          `• \`philosopher\`: Triết gia sâu sắc\n\n` +
          `Sử dụng: \`${prefix}personality [tên]\``)
        .setColor(config.COLORS?.INFO || 0x5acff5);
      return message.reply({ embeds: [embed] });
    }

    try {
      await db.execute('UPDATE guilds SET personality = ? WHERE id = ?', [newPersonality, message.guild.id]);
      
      const names = {
        default: 'Mặc định (Thân thiện)',
        tsundere: 'Tsundere (Nắng mưa)',
        toxic_gamer: 'Toxic Gamer (Cà khịa)',
        helpful_assistant: 'Trợ lý tận tâm',
        philosopher: 'Nhà triết học'
      };

      const embed = new EmbedBuilder()
        .setTitle('✅ Đã cập nhật nhân cách!')
        .setDescription(`Nhân cách của tôi tại server này giờ là: **${names[newPersonality]}**`)
        .setColor(config.COLORS?.SUCCESS || 0x00ff00)
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[Personality Command] Error:', error);
      message.reply(t('common.error', lang));
    }
  },
};
