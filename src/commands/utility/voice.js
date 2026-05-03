const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
  name: 'voice',
  aliases: ['setvoice', 'giongnoi'],
  description: 'Thiết lập giọng nói mặc định của bạn cho lệnh talk (Set your default voice for talk command)',
  usage: '[male | female | kid | robot | slow | fast | ghost | default]',
  category: 'utility',
  async execute(message, args) {
    const lang = await getLanguage(message.author.id, message.guild?.id);
    const prefix = config.PREFIX;

    const validVoices = ['male', 'female', 'kid', 'robot', 'slow', 'fast', 'ghost', 'default'];
    
    // Map some aliases
    const voiceAliases = {
      'nam': 'male',
      'nu': 'female',
      'nữ': 'female',
      'treem': 'kid',
      'ma': 'ghost'
    };

    let newVoice = args[0]?.toLowerCase();
    
    if (newVoice && voiceAliases[newVoice]) {
      newVoice = voiceAliases[newVoice];
    }

    if (newVoice === 'list') {
      const embed = new EmbedBuilder()
        .setTitle('🎙️ Danh sách các giọng nói hỗ trợ')
        .setDescription(
          `• \`default\` / \`female\` / \`nữ\`: Giọng nữ mặc định\n` +
          `• \`male\` / \`nam\`: Giọng nam\n` +
          `• \`kid\` / \`treem\`: Giọng trẻ em\n` +
          `• \`robot\`: Giọng máy móc\n` +
          `• \`ghost\` / \`ma\`: Giọng ma/vang\n` +
          `• \`slow\`: Giọng nói chậm\n` +
          `• \`fast\`: Giọng nói nhanh\n\n` +
          `Sử dụng: \`${prefix}voice [loại_giọng]\` để cài đặt giọng mặc định.\n` +
          `Hoặc dùng flag khi chat: \`!talk -m nội dung\``)
        .setColor(config.COLORS?.INFO || 0x5acff5);
      return message.reply({ embeds: [embed] });
    }

    if (!newVoice || !validVoices.includes(newVoice)) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Không tìm thấy loại giọng này')
        .setDescription(`Vui lòng xem danh sách các giọng nói hỗ trợ bằng lệnh: \`${prefix}voice list\``)
        .setColor(config.COLORS?.ERROR || 0xff0000);
      return message.reply({ embeds: [embed] });
    }

    try {
      await db.updateUser(message.author.id, { voice_type: newVoice });
      
      const names = {
        default: 'Mặc định (Nữ)',
        female: 'Nữ',
        male: 'Nam',
        kid: 'Trẻ em',
        robot: 'Robot',
        slow: 'Chậm',
        fast: 'Nhanh',
        ghost: 'Tiếng vang (Ma)'
      };

      const embed = new EmbedBuilder()
        .setTitle('✅ Đã cập nhật giọng nói!')
        .setDescription(`Giọng nói mặc định của bạn khi dùng lệnh \`talk\` bây giờ là: **${names[newVoice]}**`)
        .setColor(config.COLORS?.SUCCESS || 0x00ff00)
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[Voice Command] Error:', error);
      message.reply(t('common.error', lang));
    }
  },
};
