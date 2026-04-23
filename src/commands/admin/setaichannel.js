const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
  name: 'setaichannel',
  description: 'Thiết lập kênh chat AI tự động (Set automatic AI chat channel)',
  adminOnly: true,
  usage: '[#channel | current | none]',
  async execute(message, args) {
    let targetChannelId = null;

    if (args[0] === 'current') {
      targetChannelId = message.channel.id;
    } else if (args[0] === 'none') {
      targetChannelId = null;
    } else {
      const mentionedChannel = message.mentions.channels.first();
      targetChannelId = mentionedChannel ? mentionedChannel.id : null;
    }

    if (args[0] !== 'none' && !targetChannelId) {
      return message.reply(`Sử dụng: \`${config.PREFIX}setaichannel [#kênh | current | none]\``);
    }

    try {
      await db.execute('UPDATE guilds SET ai_channel = ? WHERE id = ?', [targetChannelId, message.guild.id]);
      
      const embed = new EmbedBuilder()
        .setTitle('🤖 Cấu hình Kênh AI')
        .setDescription(targetChannelId 
          ? `Đã thiết lập kênh <#${targetChannelId}> làm phòng chat AI. Bạn không cần tag bot hay dùng prefix trong kênh này!`
          : 'Đã hủy kích hoạt kênh chat AI tự động.')
        .setColor(targetChannelId ? 0x00ff00 : 0xff4d4d)
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[SetAIChannel] Error:', error);
      message.reply('Đã có lỗi xảy ra khi lưu cấu hình.');
    }
  },
};
