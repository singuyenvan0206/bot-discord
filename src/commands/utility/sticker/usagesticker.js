const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../database');
const { getLanguage } = require('../../../utils/i18n');
const config = require('../../../config');
const { COLOR_INFO } = require('../../../utils/emojiHelpers');

const PAGE_SIZE = 20;

module.exports = {
  name: 'stickerusage',
  aliases: ['stickerusage', 'stickeruse', 'stickerstats'],
  description: 'Hiển thị số lần sử dụng của từng sticker trong server (Show sticker usage statistics)',
  async execute(message, args) {
    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'usage') {
      commandArgs = args.slice(1);
    }

    const guild = message.guild;
    if (!guild) {
      return message.reply('Lệnh này chỉ dùng được trong server.');
    }

    const lang = await getLanguage(message.author.id, guild.id);
    let page = parseInt(commandArgs[0]) || 1;
    if (isNaN(page) || page < 1) page = 1;

    const data = await getStickerUsageData(guild, page, lang);
    const replyResult = await message.reply(data);

    let replyMessage = replyResult;
    if (replyResult && typeof replyResult.resource === 'object' && replyResult.resource?.message) {
      replyMessage = replyResult.resource.message;
    } else if (replyResult && typeof replyResult.fetchReply === 'function') {
      replyMessage = await replyResult.fetchReply().catch(() => null);
    }

    if (replyMessage && typeof replyMessage.createMessageComponentCollector === 'function') {
      attachUsageCollector(replyMessage, message.author.id, guild, lang);
    }
  }
};

async function getStickerUsageData(guild, page = 1, lang = 'vi') {
  const stickers = await guild.stickers.fetch();
  if (stickers.size === 0) {
    const embed = new EmbedBuilder()
      .setColor(COLOR_INFO)
      .setTitle(lang === 'vi' ? '📊 Thống Kê Sử Dụng Sticker' : '📊 Sticker Usage Statistics')
      .setDescription(lang === 'vi' ? 'Server này không có sticker tùy chỉnh nào.' : 'This server has no custom stickers.');
    return { embeds: [embed], components: [] };
  }

  const stats = await db.getEmojiStats(guild.id);
  const statsMap = new Map(stats.map(s => [s.emoji_id, s.use_count]));

  // Combine and sort
  const stickerList = stickers.map(sticker => {
    return {
      sticker,
      count: statsMap.get(sticker.id) || 0
    };
  });

  // Sort descending by count, then by sticker name
  stickerList.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.sticker.name.localeCompare(b.sticker.name);
  });

  const totalStickers = stickerList.length;
  const totalPages = Math.max(1, Math.ceil(totalStickers / PAGE_SIZE));
  page = Math.max(1, Math.min(page, totalPages));

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = stickerList.slice(start, end);

  const lines = pageItems.map((item, idx) => {
    const globalIdx = start + idx + 1;
    return `${globalIdx}. **${item.sticker.name}** (ID: \`${item.sticker.id}\`) — **${item.count.toLocaleString()}** ${lang === 'vi' ? 'lượt dùng' : 'uses'}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle(lang === 'vi' ? '📊 Thống Kê Sử Dụng Sticker' : '📊 Sticker Usage Statistics')
    .setDescription(lines.join('\n'))
    .setFooter({
      text: lang === 'vi' 
        ? `Trang ${page}/${totalPages} • Tổng cộng ${totalStickers} sticker` 
        : `Page ${page}/${totalPages} • Total ${totalStickers} stickers`
    })
    .setTimestamp();

  // Navigation buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`stickerusage_page_${page - 1}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`stickerusage_page_${page + 1}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

function attachUsageCollector(reply, authorId, guild, lang) {
  const collector = reply.createMessageComponentCollector({
    filter: i => i.customId.startsWith('stickerusage_') && i.user.id === authorId,
    time: 5 * 60 * 1000 // 5 minutes
  });

  collector.on('collect', async (i) => {
    try {
      const parts = i.customId.split('_');
      const page = parseInt(parts[2]);
      const data = await getStickerUsageData(guild, page, lang);
      await i.update(data);
    } catch (err) {
      console.error('[Sticker Usage Collector Error]', err);
    }
  });

  collector.on('end', async () => {
    try {
      const msg = await reply.fetch();
      if (!msg?.components?.length) return;
      const disabledRows = msg.components.map(row => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components = newRow.components.map(c => {
          if (c.data.type === 2) { // Button
            return ButtonBuilder.from(c).setDisabled(true);
          }
          return c;
        });
        return newRow;
      });
      await reply.edit({ components: disabledRows }).catch(() => {});
    } catch (_) {}
  });
}
