const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
  name: 'voice',
  aliases: ['setvoice', 'giongnoi'],
  description: 'Thiết lập giới tính và hiệu ứng giọng nói mặc định cho lệnh talk',
  usage: '[male | female] [kid | robot | ghost | slow | fast | none]',
  category: 'utility',
  async execute(message, args) {
    const lang = await getLanguage(message.author.id, message.guild?.id);
    const prefix = config.PREFIX;

    if (args.length === 0 || args[0].toLowerCase() === 'list') {
      const embed = new EmbedBuilder()
        .setTitle('🎙️ Danh sách cấu hình Giọng nói')
        .setDescription(
          `Bạn có thể cấu hình **Giới tính** và **Hiệu ứng** riêng biệt!\n\n` +
          `**1. Giới tính (Nam/Nữ):**\n` +
          `• \`default\` / \`female\` / \`nữ\`: Giọng nữ\n` +
          `• \`male\` / \`nam\`: Giọng nam\n\n` +
          `**2. Hiệu ứng (Effects):**\n` +
          `• \`none\`: Không có hiệu ứng (Mặc định)\n` +
          `• \`kid\` / \`treem\`: Giọng trẻ em\n` +
          `• \`robot\`: Giọng máy móc\n` +
          `• \`ghost\` / \`ma\`: Giọng ma/vang\n` +
          `• \`slow\`: Giọng nói chậm\n` +
          `• \`fast\`: Giọng nói nhanh\n\n` +
          `**Cách sử dụng:**\n` +
          `\`${prefix}voice male\` (Chỉ đổi thành giọng nam)\n` +
          `\`${prefix}voice ghost\` (Chỉ thêm hiệu ứng ma)\n` +
          `\`${prefix}voice male ghost\` (Đổi cả 2 cùng lúc)\n` +
          `\`${prefix}voice none\` (Xoá hiệu ứng)`
        )
        .setColor(config.COLORS?.INFO || 0x5acff5);
      return message.reply({ embeds: [embed] });
    }

    const baseVoiceAliases = { 'nam': 'male', 'male': 'male', 'nu': 'female', 'nữ': 'female', 'female': 'female', 'default': 'default' };
    const effectAliases = { 'treem': 'kid', 'kid': 'kid', 'robot': 'robot', 'ma': 'ghost', 'ghost': 'ghost', 'slow': 'slow', 'fast': 'fast', 'none': 'none' };

    let newBase = null;
    let newEffect = null;
    let invalidArg = null;

    for (const arg of args) {
      const token = arg.toLowerCase();
      if (baseVoiceAliases[token]) {
        newBase = baseVoiceAliases[token];
      } else if (effectAliases[token]) {
        newEffect = effectAliases[token];
      } else {
        invalidArg = token;
      }
    }

    if (invalidArg) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Tham số không hợp lệ')
        .setDescription(`Không tìm thấy lựa chọn \`${invalidArg}\`.\nVui lòng xem danh sách bằng lệnh: \`${prefix}voice list\``)
        .setColor(config.COLORS?.ERROR || 0xff0000);
      return message.reply({ embeds: [embed] });
    }

    try {
      const updates = {};
      if (newBase) updates.voice_type = newBase;
      if (newEffect) updates.voice_effect = newEffect;

      await db.updateUser(message.author.id, updates);
      
      const names = {
        default: 'Nữ (Mặc định)', female: 'Nữ', male: 'Nam',
        kid: 'Trẻ em', robot: 'Robot', slow: 'Chậm', fast: 'Nhanh', ghost: 'Tiếng vang (Ma)', none: 'Không (Mặc định)'
      };

      let desc = '';
      if (newBase) desc += `• Giới tính: **${names[newBase]}**\n`;
      if (newEffect) desc += `• Hiệu ứng: **${names[newEffect]}**\n`;

      const embed = new EmbedBuilder()
        .setTitle('✅ Đã cập nhật cấu hình giọng nói!')
        .setDescription(`Cấu hình mặc định của bạn khi dùng lệnh \`talk\` đã được lưu:\n\n${desc}`)
        .setColor(config.COLORS?.SUCCESS || 0x00ff00)
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[Voice Command] Error:', error);
      message.reply(t('common.error', lang));
    }
  },
};
