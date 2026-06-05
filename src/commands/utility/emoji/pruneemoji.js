const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLOR_ERROR } = require('../../../utils/emojiHelpers');
const db = require('../../../database');

module.exports = {
  name: 'pruneemoji',
  aliases: ['pruneemoji'],
  description: 'Dọn dẹp emoji ít sử dụng trên server (Delete inactive emojis)',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      throw new Error('You need the Manage Expressions permission to use this command.');
    }

    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'prune') {
      commandArgs = args.slice(1);
    }

    const minUses = parseInt(commandArgs[0]) || 5;
    const inactiveDays = parseInt(commandArgs[1]) || 30;

    const guild = message.guild;
    const emojis = await guild.emojis.fetch();
    const stats = await db.getEmojiStats(guild.id);
    const statsMap = new Map(stats.map(s => [s.emoji_id, s]));

    const pruneList = [];
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
        pruneList.push(emoji);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR_ERROR)
      .setTitle('🗑️ Tự Động Dọn Dẹp Emoji')
      .setDescription(`Ngưỡng kiểm tra: ít hơn **${minUses}** lượt sử dụng trong **${inactiveDays}** ngày.`);

    if (pruneList.length === 0) {
      embed.setDescription(embed.data.description + '\n\n🎉 Không tìm thấy emoji nào cần dọn dẹp.');
    } else {
      const names = [];
      for (const emoji of pruneList) {
        names.push(`\`:${emoji.name}:\``);
        await emoji.delete().catch(() => {});
        await db.clearEmojiStats(guild.id, emoji.id).catch(() => {});
      }

      const truncate = (arr, limit = 20) => arr.length > limit ? arr.slice(0, limit).join(', ') + `... và ${arr.length - limit} emoji khác` : arr.join(', ');

      embed.setDescription(embed.data.description + `\n\nĐã xóa thành công **${pruneList.length}** emoji ít sử dụng để giải phóng dung lượng.`);
      embed.addFields({ name: 'Emoji đã xóa', value: truncate(names) });
    }

    if (message.reply) {
      await message.reply({ embeds: [embed] });
    }
    return embed;
  }
};
