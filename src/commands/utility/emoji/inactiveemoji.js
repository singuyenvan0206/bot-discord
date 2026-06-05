const { EmbedBuilder } = require('discord.js');
const { COLOR_INFO } = require('../../../utils/emojiHelpers');
const db = require('../../../database');
const config = require('../../../config');

module.exports = {
  name: 'inactiveemoji',
  aliases: ['inactiveemoji'],
  description: 'Hiển thị các emoji ít sử dụng trên server (Show a list of inactive emojis)',
  async execute(message, args) {
    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'inactive') {
      commandArgs = args.slice(1);
    }

    const minUses = parseInt(commandArgs[0]) || 5;
    const inactiveDays = parseInt(commandArgs[1]) || 30;

    const guild = message.guild;
    const emojis = await guild.emojis.fetch();
    const stats = await db.getEmojiStats(guild.id);
    const statsMap = new Map(stats.map(s => [s.emoji_id, s]));

    const inactiveList = [];
    const now = Date.now();
    const thresholdMs = inactiveDays * 24 * 60 * 60 * 1000;

    for (const [id, emoji] of emojis) {
      const stat = statsMap.get(id);
      const useCount = stat ? stat.use_count : 0;
      const lastUsed = stat ? Number(stat.last_used_at) : now;

      const emojiAgeMs = now - emoji.createdTimestamp;
      const trackerAgeMs = now - lastUsed;

      let isInactive = false;
      if (emojiAgeMs >= thresholdMs && trackerAgeMs >= thresholdMs) {
        if (useCount <= minUses) {
          isInactive = true;
        }
      }

      if (isInactive) {
        inactiveList.push({
          emoji,
          useCount,
          lastUsed
        });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR_INFO)
      .setTitle('📊 Thống Kê Emoji Không Hoạt Động')
      .setDescription(`Ngưỡng kiểm tra: ít hơn **${minUses}** lượt sử dụng trong **${inactiveDays}** ngày.`);

    if (inactiveList.length === 0) {
      embed.setDescription(embed.data.description + '\n\n🎉 Tuyệt vời! Không có emoji nào bị coi là không hoạt động trên máy chủ.');
    } else {
      const listString = inactiveList.map(item => {
        const lastUsedStr = item.useCount > 0 ? `<t:${Math.floor(item.lastUsed / 1000)}:R>` : '_Chưa bao giờ sử dụng_';
        return `${item.emoji} | Tên: \`:${item.emoji.name}:\` | Lượt dùng: \`${item.useCount}\` | Dùng gần nhất: ${lastUsedStr}`;
      }).join('\n');

      const truncate = (str, limit = 4000) => {
        if (str.length > limit) {
          return str.slice(0, limit) + '\n... và nhiều emoji khác.';
        }
        return str;
      };

      embed.addFields({ name: `Danh sách emoji ít hoạt động (${inactiveList.length})`, value: truncate(listString) });
    }

    if (message.reply) {
      await message.reply({ embeds: [embed] });
    }
    return embed;
  }
};
