const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { getLanguage, t } = require('../../utils/i18n');

module.exports = {
  name: 'aiswitch',
  aliases: ['toggleai', 'ai'],
  description: 'Bật/Tắt toàn bộ chức năng AI của bot (Enable/Disable AI functionality)',
  adminOnly: true,
  usage: '[on | off]',
  async execute(message, args) {
    const lang = await getLanguage(message.author.id, message.guild?.id);
    const prefix = config.PREFIX;
    let newState = null;

    if (args[0] === 'on' || args[0] === 'enable') {
      newState = true;
    } else if (args[0] === 'off' || args[0] === 'disable') {
      newState = false;
    }

    if (newState === null) {
      const embed = new EmbedBuilder()
        .setTitle('🤖 AI Switch')
        .setDescription(`Sử dụng: \`${prefix}aiswitch [on | off]\`\n\n` + 
          `• \`on\`: Bật AI (Tag bot và AI Channel sẽ hoạt động)\n` +
          `• \`off\`: Tắt AI (Bot sẽ phớt lờ mọi tương tác AI)`)
        .setColor(config.COLORS?.INFO || 0x5acff5);
      return message.reply({ embeds: [embed] });
    }

    try {
      await db.execute('UPDATE guilds SET ai_enabled = ? WHERE id = ?', [newState ? 1 : 0, message.guild.id]);
      
      const embed = new EmbedBuilder()
        .setTitle('🤖 AI System Updated')
        .setDescription(newState 
          ? '✅ Hệ thống AI đã được **BẬT**. Bot sẽ phản hồi khi được tag hoặc trong kênh AI.'
          : '❌ Hệ thống AI đã được **TẮT**. Bot sẽ không phản hồi các cuộc trò chuyện AI.')
        .setColor(newState ? 0x00ff00 : 0xff4d4d)
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[AISwitch] Error:', error);
      message.reply('Đã có lỗi xảy ra khi cập nhật trạng thái AI.');
    }
  },
};
