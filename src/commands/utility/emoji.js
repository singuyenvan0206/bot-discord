const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

// Embed Colors
const COLOR_SUCCESS = 0x57F287; // Discord Green
const COLOR_ERROR = 0xED4245; // Discord Red
const COLOR_INFO = 0x5865F2; // Discord Blurple

// Helper: Resolve Emoji from Guild cache or parse custom emoji structure
function resolveEmoji(guild, query) {
  if (!query) return null;
  
  // Try matching <a:name:id> or <:name:id>
  const customEmojiMatch = query.match(/<(a)?:(\w+):(\d+)>/);
  if (customEmojiMatch) {
    const id = customEmojiMatch[3];
    return guild.emojis.cache.get(id) || { id, name: customEmojiMatch[2], animated: !!customEmojiMatch[1], isExternal: true };
  }

  // Try direct ID
  if (/^\d+$/.test(query)) {
    const emoji = guild.emojis.cache.get(query);
    if (emoji) return emoji;
  }

  // Try matching by name (case-insensitive)
  const nameMatch = guild.emojis.cache.find(
    e => e.name.toLowerCase() === query.toLowerCase()
  );
  if (nameMatch) return nameMatch;

  return null;
}

// Helper: Convert Unicode emoji, custom emoji, or URL to a valid image URL
function parseEmojiInputToUrl(query) {
  if (!query) return null;

  // 1. If it's a HTTP/HTTPS URL, return it
  if (/^https?:\/\//i.test(query)) {
    return query;
  }

  // 2. If it's a custom Discord emoji <:name:id> or <a:name:id>
  const customEmojiMatch = query.match(/<(a)?:(\w+):(\d+)>/);
  if (customEmojiMatch) {
    const animated = !!customEmojiMatch[1];
    const id = customEmojiMatch[3];
    return `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
  }

  // 3. If it is a Unicode emoji
  const codePoints = [...query].map(char => char.codePointAt(0).toString(16));
  if (codePoints.length > 0) {
    const firstCodePoint = parseInt(codePoints[0], 16);
    if (firstCodePoint >= 128 || codePoints.includes('20e3')) {
      const hasKeycap = codePoints.includes('20e3');
      const filtered = hasKeycap ? codePoints : codePoints.filter(cp => cp !== 'fe0f');
      const hex = filtered.join('-');
      return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${hex}.png`;
    }
  }

  return query;
}

// Helper: Download image and return buffer
async function downloadImage(url) {
  let targetUrl = parseEmojiInputToUrl(url) || url;
  if (targetUrl.includes('//localhost')) {
    targetUrl = targetUrl.replace('//localhost', '//127.0.0.1');
  }

  try {
    const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const contentType = response.headers['content-type'];
    
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('The URL does not point to a valid image.');
    }

    if (buffer.length > 256 * 1024) {
      throw new Error('Image size exceeds Discord\'s limit of 256 KB.');
    }

    return { buffer, contentType };
  } catch (error) {
    if (error.message.includes('exceeds')) throw error;
    throw new Error(`Failed to download image from the URL. Details: ${error.message}`);
  }
}

// -------------------------------------------------------------
// Subcommand Handlers
// -------------------------------------------------------------

// 1. ADD EMOJI
async function handleAdd(guild, name, urlOrEmoji) {
  if (!name || !/^\w{2,32}$/.test(name)) {
    throw new Error('Emoji name must be alphanumeric (underscores allowed) and between 2 and 32 characters.');
  }

  const targetUrl = parseEmojiInputToUrl(urlOrEmoji) || urlOrEmoji;
  const { buffer } = await downloadImage(targetUrl);
  const emoji = await guild.emojis.create({ attachment: buffer, name });
  
  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('✅ Emoji Added')
    .setDescription(`Successfully created custom emoji: ${emoji}`)
    .addFields(
      { name: 'Name', value: `\`:${emoji.name}:\``, inline: true },
      { name: 'ID', value: `\`${emoji.id}\``, inline: true },
      { name: 'Type', value: emoji.animated ? 'Animated (GIF)' : 'Static', inline: true }
    )
    .setThumbnail(emoji.url);
}

// 2. DELETE EMOJI
async function handleDelete(guild, emojiQuery) {
  const emoji = resolveEmoji(guild, emojiQuery);
  if (!emoji) {
    throw new Error(`Could not find custom emoji matching \`${emojiQuery}\` in this server.`);
  }
  if (emoji.isExternal) {
    throw new Error(`The emoji matching \`${emojiQuery}\` belongs to another server.`);
  }

  const name = emoji.name;
  const id = emoji.id;
  const wasAnimated = emoji.animated;
  
  await emoji.delete();
  
  const db = require('../../database');
  await db.clearEmojiStats(guild.id, id).catch(() => {});

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('🗑️ Emoji Deleted')
    .setDescription(`Successfully deleted custom emoji: \`:${name}:\``)
    .addFields(
      { name: 'Name', value: `\`:${name}:\``, inline: true },
      { name: 'ID', value: `\`${id}\``, inline: true },
      { name: 'Type', value: wasAnimated ? 'Animated' : 'Static', inline: true }
    );
}

// 3. RENAME EMOJI
async function handleRename(guild, emojiQuery, newName) {
  if (!newName || !/^\w{2,32}$/.test(newName)) {
    throw new Error('New name must be alphanumeric and between 2 and 32 characters.');
  }

  const emoji = resolveEmoji(guild, emojiQuery);
  if (!emoji) {
    throw new Error(`Could not find custom emoji matching \`${emojiQuery}\` in this server.`);
  }
  if (emoji.isExternal) {
    throw new Error('Cannot rename emojis that belong to other servers.');
  }

  const oldName = emoji.name;
  await emoji.setName(newName);

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('✏️ Emoji Renamed')
    .setDescription(`Successfully renamed custom emoji: ${emoji}`)
    .addFields(
      { name: 'Old Name', value: `\`:${oldName}:\``, inline: true },
      { name: 'New Name', value: `\`:${emoji.name}:\``, inline: true },
      { name: 'ID', value: `\`${emoji.id}\``, inline: true }
    )
    .setThumbnail(emoji.url);
}

// 4. LIST EMOJIS
async function handleList(guild) {
  const emojis = await guild.emojis.fetch();
  const staticEmojis = emojis.filter(e => !e.animated);
  const animatedEmojis = emojis.filter(e => e.animated);

  let maxSlots = 50;
  if (guild.premiumTier === 1) maxSlots = 100;
  if (guild.premiumTier === 2) maxSlots = 150;
  if (guild.premiumTier === 3) maxSlots = 250;

  const staticCount = staticEmojis.size;
  const animatedCount = animatedEmojis.size;

  const staticString = staticEmojis.map(e => e.toString()).join(' ') || '_No static emojis_';
  const animatedString = animatedEmojis.map(e => e.toString()).join(' ') || '_No animated emojis_';

  const truncate = (str, limit = 1000) => {
    if (str.length > limit) {
      return str.slice(0, limit) + ' ... and more';
    }
    return str;
  };

  return new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle(`Guild Emojis for ${guild.name}`)
    .addFields(
      {
        name: `Static Emojis (${staticCount} / ${maxSlots} slots)`,
        value: truncate(staticString)
      },
      {
        name: `Animated Emojis (${animatedCount} / ${maxSlots} slots)`,
        value: truncate(animatedString)
      }
    )
    .setFooter({ text: `Total Custom Emojis: ${emojis.size} | Premium Tier: Level ${guild.premiumTier}` });
}

// 5. EMOJI INFO
async function handleInfo(guild, emojiQuery) {
  const emoji = resolveEmoji(guild, emojiQuery);
  if (!emoji) {
    throw new Error(`Could not find custom emoji matching \`${emojiQuery}\`.`);
  }

  const embed = new EmbedBuilder().setColor(COLOR_INFO);

  if (emoji.isExternal) {
    const extUrl = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
    embed
      .setTitle(`ℹ️ Emoji Info (External Server)`)
      .setDescription(`This emoji is from another server. You can steal it using \`/emoji steal <emoji>\`!`)
      .addFields(
        { name: 'Name', value: `\`:${emoji.name}:\``, inline: true },
        { name: 'ID', value: `\`${emoji.id}\``, inline: true },
        { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
        { name: 'Image Link', value: `[Click Here](${extUrl})` }
      )
      .setThumbnail(extUrl);
  } else {
    const creator = await emoji.fetchAuthor().catch(() => null);
    const rolesList = emoji.roles.cache.map(r => r.toString()).join(', ') || 'No restrictions (everyone can use)';
    
    embed
      .setTitle(`ℹ️ Emoji Info: :${emoji.name}:`)
      .addFields(
        { name: 'Name', value: `\`:${emoji.name}:\``, inline: true },
        { name: 'ID', value: `\`${emoji.id}\``, inline: true },
        { name: 'Type', value: emoji.animated ? 'Animated (GIF)' : 'Static', inline: true },
        { name: 'Created At', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:f>`, inline: true },
        { name: 'Created By', value: creator ? creator.toString() : 'Unknown (Missing Permissions)', inline: true },
        { name: 'Role Lock Restrictions', value: rolesList }
      )
      .setThumbnail(emoji.url)
      .setImage(emoji.url);
  }

  return embed;
}

// 6. STEAL EMOJI
async function handleSteal(guild, emojiOrMsgUrl) {
  let targetUrl = '';
  let targetName = '';
  let animated = false;

  const msgUrlMatch = emojiOrMsgUrl.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (msgUrlMatch) {
    const channelId = msgUrlMatch[2];
    const messageId = msgUrlMatch[3];

    const channel = await guild.client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      throw new Error(`Could not access channel with ID \`${channelId}\` (Ensure bot has access to that channel).`);
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      throw new Error(`Could not find message with ID \`${messageId}\` in channel <#${channelId}>.`);
    }

    const emojiMatch = message.content.match(/<(a)?:(\w+):(\d+)>/);
    if (!emojiMatch) {
      throw new Error('No custom emojis found in the specified message contents.');
    }

    animated = !!emojiMatch[1];
    targetName = emojiMatch[2];
    const emojiId = emojiMatch[3];
    targetUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;
  } else {
    const emojiMatch = emojiOrMsgUrl.match(/<(a)?:(\w+):(\d+)>/);
    if (!emojiMatch) {
      throw new Error('Invalid format. Please supply a custom emoji (e.g., `<:name:id>`) or a Discord message link.');
    }

    animated = !!emojiMatch[1];
    targetName = emojiMatch[2];
    const emojiId = emojiMatch[3];
    targetUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;
  }

  const { buffer } = await downloadImage(targetUrl);
  const newEmoji = await guild.emojis.create({ attachment: buffer, name: targetName });

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('🥷 Emoji Stolen')
    .setDescription(`Successfully stolen and added emoji: ${newEmoji}`)
    .addFields(
      { name: 'Name', value: `\`:${newEmoji.name}:\``, inline: true },
      { name: 'ID', value: `\`${newEmoji.id}\``, inline: true },
      { name: 'Type', value: newEmoji.animated ? 'Animated' : 'Static', inline: true }
    )
    .setThumbnail(newEmoji.url);
}

// 7. RESTRICT EMOJI ROLES
async function handleRestrict(guild, emojiQuery, role) {
  const emoji = resolveEmoji(guild, emojiQuery);
  if (!emoji) {
    throw new Error(`Could not find custom emoji matching \`${emojiQuery}\` in this server.`);
  }
  if (emoji.isExternal) {
    throw new Error('Cannot edit role restrictions on emojis belonging to other servers.');
  }

  if (!role) {
    await emoji.roles.set([]);
    return new EmbedBuilder()
      .setColor(COLOR_SUCCESS)
      .setTitle('🔒 Emoji Restriction Cleared')
      .setDescription(`Restrictions removed for emoji ${emoji}. Now anyone can use it.`)
      .setThumbnail(emoji.url);
  }

  await emoji.roles.set([role.id]);

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('🔒 Emoji Restricted')
    .setDescription(`Successfully restricted emoji ${emoji} to role ${role}.`)
    .addFields(
      { name: 'Emoji Name', value: `\`:${emoji.name}:\``, inline: true },
      { name: 'Allowed Role', value: `${role}`, inline: true }
    )
    .setThumbnail(emoji.url);
}

// Helper: Resolve emoji suggestion channel
async function getSuggestChannel(guild) {
  const db = require('../../database');
  const channelId = await db.getGuildSetting(guild.id, 'emoji_suggest_channel');
  if (channelId) {
    const channel = guild.channels.cache.get(channelId);
    if (channel) return channel;
  }

  // Fallback to name match
  const fallback = guild.channels.cache.find(
    c => c.name.toLowerCase().includes('đề-xuất-emoji') || c.name.toLowerCase().includes('de-xuat-emoji')
  );
  return fallback || null;
}

// 9. SUGGEST EMOJI
async function handleSuggest(guild, name, url, author) {
  if (!name || !/^\w{2,32}$/.test(name)) {
    throw new Error('Emoji name must be alphanumeric (underscores allowed) and between 2 and 32 characters.');
  }

  const parsedUrl = parseEmojiInputToUrl(url);
  if (!parsedUrl) {
    throw new Error('Invalid emoji or image source provided.');
  }

  const channel = await getSuggestChannel(guild);
  if (!channel) {
    throw new Error('Emoji suggestion channel is not configured, and no channel named `đề-xuất-emoji` was found in this server.');
  }

  const db = require('../../database');
  const approveEmoji = await db.getGuildSetting(guild.id, 'emoji_approve_reaction', '✅');
  const rejectEmoji = await db.getGuildSetting(guild.id, 'emoji_reject_reaction', '❌');

  const embed = new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle('💡 Đề Xuất Emoji Mới')
    .setDescription(`Một emoji mới đã được đề xuất và đang chờ duyệt.\nBiểu cảm duyệt: ${approveEmoji} | Từ chối: ${rejectEmoji}`)
    .addFields(
      { name: 'Tên Đề Xuất', value: `\`:${name}:\``, inline: true },
      { name: 'Người Đề Xuất', value: `${author}`, inline: true }
    )
    .setImage(parsedUrl)
    .setFooter({ text: `Source: ${parsedUrl} | Name: ${name}` });

  const suggestMsg = await channel.send({ embeds: [embed] });
  await suggestMsg.react('👍').catch(() => {});
  await suggestMsg.react('👎').catch(() => {});

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('✅ Đã Gửi Đề Xuất')
    .setDescription(`Đề xuất emoji của bạn đã được gửi thành công đến kênh ${channel}!`);
}

// 10. CONFIG SUGGESTIONS
async function handleConfig(guild, channelQuery, approveQuery, rejectQuery) {
  const db = require('../../database');
  let description = '';

  if (channelQuery) {
    if (channelQuery.toLowerCase() === 'clear') {
      await db.setGuildSetting(guild.id, 'emoji_suggest_channel', null);
      description += `• Kênh đề xuất: *Đã xóa cấu hình* (Sẽ tự động tìm kênh có tên chứa \`đề-xuất-emoji\`)\n`;
    } else {
      let channelId = '';
      const channelMatch = channelQuery.match(/^<#(\d+)>$/);
      if (channelMatch) {
        channelId = channelMatch[1];
      } else if (/^\d+$/.test(channelQuery)) {
        channelId = channelQuery;
      } else {
        const channel = guild.channels.cache.find(c => c.name.toLowerCase() === channelQuery.toLowerCase());
        if (channel) channelId = channel.id;
      }

      if (!channelId || !guild.channels.cache.has(channelId)) {
        throw new Error(`Could not find channel matching \`${channelQuery}\` in this server.`);
      }

      await db.setGuildSetting(guild.id, 'emoji_suggest_channel', channelId);
      description += `• Kênh đề xuất: <#${channelId}>\n`;
    }
  }

  if (approveQuery) {
    await db.setGuildSetting(guild.id, 'emoji_approve_reaction', approveQuery);
    description += `• Biểu cảm duyệt: ${approveQuery}\n`;
  }

  if (rejectQuery) {
    await db.setGuildSetting(guild.id, 'emoji_reject_reaction', rejectQuery);
    description += `• Biểu cảm từ chối: ${rejectQuery}\n`;
  }

  if (!description) {
    const channelId = await db.getGuildSetting(guild.id, 'emoji_suggest_channel');
    const approve = await db.getGuildSetting(guild.id, 'emoji_approve_reaction', '✅');
    const reject = await db.getGuildSetting(guild.id, 'emoji_reject_reaction', '❌');
    
    description = `• Kênh đề xuất: ${channelId ? `<#${channelId}>` : '*Chưa cấu hình (mặc định tìm theo tên)*'}\n` +
                  `• Biểu cảm duyệt: ${approve}\n` +
                  `• Biểu cảm từ chối: ${reject}\n`;
  }

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('⚙️ Cấu Hình Đề Xuất Emoji')
    .setDescription(description);
}

// 11. SEARCH EMOJIS
async function handleSearch(guild, query, prefix) {
  if (!query) {
    throw new Error('Please provide a search query.');
  }

  const slackmojis = require('../../data/slackmojis.json');
  const matches = slackmojis.filter(e => e.name.toLowerCase().includes(query.toLowerCase())).slice(0, 25);

  if (matches.length === 0) {
    return new EmbedBuilder()
      .setColor(COLOR_ERROR)
      .setTitle('🔍 Kết quả tìm kiếm Emoji')
      .setDescription(`Không tìm thấy emoji nào phù hợp với từ khóa \`${query}\`.`);
  }

  const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('emoji_search_select')
    .setPlaceholder('Chọn một emoji để thêm hoặc đề xuất...')
    .addOptions(
      matches.map(e => {
        const relativePath = e.image_url.replace('https://emojis.slackmojis.com/emojis/images/', '').split('?')[0];
        return {
          label: `:${e.name.slice(0, 20)}:`,
          value: `${e.name.slice(0, 32)}|${relativePath}`,
          description: `Category: ${e.category?.name || 'General'}`,
        };
      })
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const listText = matches.map((e, idx) => `${idx + 1}. **${e.name}** (${e.category?.name || 'General'})`).join('\n');

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_INFO)
        .setTitle(`🔍 Kết quả tìm kiếm cho: ${query}`)
        .setDescription(`Tìm thấy **${matches.length}** kết quả phù hợp:\n\n${listText}\n\n*Hãy chọn emoji từ menu bên dưới để tải về.*`)
    ],
    components: [row]
  };
}

async function createEmojiFromUrl(guild, name, url) {
  const { buffer } = await downloadImage(url);
  return await guild.emojis.create({ attachment: buffer, name });
}

// 12. INACTIVE EMOJIS
async function handleInactive(guild, minUses = 5, inactiveDays = 30) {
  const db = require('../../database');
  const emojis = await guild.emojis.fetch();
  const stats = await db.getEmojiStats(guild.id);
  const statsMap = new Map(stats.map(s => [s.emoji_id, s]));

  const inactiveList = [];
  const now = Date.now();
  const thresholdMs = inactiveDays * 24 * 60 * 60 * 1000;

  for (const [id, emoji] of emojis) {
    const stat = statsMap.get(id);
    const useCount = stat ? stat.use_count : 0;
    const lastUsed = stat ? Number(stat.last_used_at) : 0;

    let isInactive = false;
    if (useCount === 0) {
      isInactive = true;
    } else if (useCount <= minUses) {
      if (inactiveDays > 0) {
        if (now - lastUsed >= thresholdMs) {
          isInactive = true;
        }
      } else {
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

  // Sort by usage count (lowest first), then last used (oldest first)
  inactiveList.sort((a, b) => {
    if (a.useCount !== b.useCount) return a.useCount - b.useCount;
    return a.lastUsed - b.lastUsed;
  });

  if (inactiveList.length === 0) {
    return new EmbedBuilder()
      .setColor(COLOR_SUCCESS)
      .setTitle('📊 Inactive Emojis')
      .setDescription('Chúc mừng! Không tìm thấy emoji nào lười hoạt động hoặc ít được sử dụng.');
  }

  const listText = inactiveList.slice(0, 15).map((item, idx) => {
    const lastUsedStr = item.lastUsed > 0 ? `<t:${Math.floor(item.lastUsed / 1000)}:R>` : '*Chưa bao giờ dùng*';
    return `${idx + 1}. ${item.emoji} \`:${item.emoji.name}:\`\n   • **Lượt dùng:** \`${item.useCount}\` | **Dùng cuối:** ${lastUsedStr}`;
  }).join('\n');

  const totalCount = inactiveList.length;

  return new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle(`📊 Danh sách Emoji ít dùng (${totalCount} Emojis)`)
    .setDescription(`Dưới đây là các emoji có dưới **${minUses} lượt dùng** hoặc không hoạt động trong **${inactiveDays} ngày** qua:\n\n${listText}\n\n${totalCount > 15 ? `*...và còn ${totalCount - 15} emoji khác.*` : ''}\n\n*Admin có thể sử dụng lệnh \`/emoji prune\` hoặc \`$emoji prune\` để dọn dẹp các emoji này.*`);
}

// 13. PRUNE INACTIVE EMOJIS
async function handlePrune(guild, minUses = 5, inactiveDays = 30) {
  const db = require('../../database');
  const emojis = await guild.emojis.fetch();
  const stats = await db.getEmojiStats(guild.id);
  const statsMap = new Map(stats.map(s => [s.emoji_id, s]));

  const pruneList = [];
  const now = Date.now();
  const thresholdMs = inactiveDays * 24 * 60 * 60 * 1000;

  for (const [id, emoji] of emojis) {
    const stat = statsMap.get(id);
    const useCount = stat ? stat.use_count : 0;
    const lastUsed = stat ? Number(stat.last_used_at) : 0;

    let isInactive = false;
    if (useCount === 0) {
      isInactive = true;
    } else if (useCount <= minUses) {
      if (inactiveDays > 0) {
        if (now - lastUsed >= thresholdMs) {
          isInactive = true;
        }
      } else {
        isInactive = true;
      }
    }

    if (isInactive) {
      pruneList.push(emoji);
    }
  }

  if (pruneList.length === 0) {
    return new EmbedBuilder()
      .setColor(COLOR_SUCCESS)
      .setTitle('🗑️ Prune Emojis')
      .setDescription('Không tìm thấy emoji nào cần dọn dẹp.');
  }

  const prunedCount = pruneList.length;
  const names = [];
  for (const emoji of pruneList) {
    names.push(`\`:${emoji.name}:\``);
    await emoji.delete().catch(() => {});
    await db.clearEmojiStats(guild.id, emoji.id).catch(() => {});
  }

  const truncate = (arr, limit = 20) => {
    if (arr.length > limit) {
      return arr.slice(0, limit).join(', ') + `... và ${arr.length - limit} emoji khác`;
    }
    return arr.join(', ');
  };

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('🗑️ Đã Dọn Dẹp Emoji Thành Công')
    .setDescription(`Đã xóa thành công **${prunedCount}** emoji ít sử dụng khỏi server.`)
    .addFields({ name: 'Danh sách đã xóa', value: truncate(names) });
}

// 14. DYNAMIC WEB SEARCH EMOJIS
async function handleWebSearch(guild, query, prefix) {
  if (!query) {
    throw new Error('Please provide a search query.');
  }

  let matches = [];
  try {
    const response = await axios.get(`https://slackmojis.com/emojis/search?query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    
    // Parse response HTML with regex to extract custom emojis
    const regex = /data-emoji-id="(\d+)"[^]*?src="([^"]+)"[^]*?class='name'[^]*?>\s*:([^:]+):/g;
    let match;
    while ((match = regex.exec(response.data)) !== null) {
      matches.push({
        id: parseInt(match[1]),
        image_url: match[2],
        name: match[3].trim()
      });
    }
  } catch (err) {
    console.warn('Live web search query failed, using offline cache fallback:', err.message);
  }

  // Fallback to local slackmojis.json if live query failed or returned no results
  if (matches.length === 0) {
    const slackmojis = require('../../data/slackmojis.json');
    matches = slackmojis.filter(e => e.name.toLowerCase().includes(query.toLowerCase())).slice(0, 25);
  } else {
    matches = matches.slice(0, 25);
  }

  if (matches.length === 0) {
    return new EmbedBuilder()
      .setColor(COLOR_ERROR)
      .setTitle('🔍 Kết quả tìm kiếm Emoji trên Web')
      .setDescription(`Không tìm thấy emoji nào phù hợp với từ khóa \`${query}\` trên Slackmojis.`);
  }

  const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('emoji_search_select')
    .setPlaceholder('Chọn một emoji để thêm hoặc đề xuất...')
    .addOptions(
      matches.map(e => {
        const relativePath = e.image_url.replace('https://emojis.slackmojis.com/emojis/images/', '').split('?')[0];
        return {
          label: `:${e.name.slice(0, 20)}:`,
          value: `${e.name.slice(0, 32)}|${relativePath}`,
          description: `Slackmojis (ID: ${e.id})`,
        };
      })
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const listText = matches.map((e, idx) => `${idx + 1}. **${e.name}** (ID: ${e.id})`).join('\n');

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_INFO)
        .setTitle(`🔍 Kết quả tìm kiếm Web cho: ${query}`)
        .setDescription(`Tìm thấy **${matches.length}** kết quả trực tuyến phù hợp:\n\n${listText}\n\n*Hãy chọn emoji từ menu bên dưới để tải về.*`)
    ],
    components: [row]
  };
}

// 8. HELP GUIDE
function handleHelp(prefix) {
  return new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle('📖 Emoji Manager Help Guide')
    .setDescription(`Manage your server's custom emojis easily. Currently configured prefix is \`${prefix}\`.\nChoose between **Slash Commands (\`/\`)** or **Prefix Commands (\`${prefix}\`)**.`)
    .addFields(
      {
        name: '➕ Add Emoji',
        value: `* **Slash:** \`/emoji add name: <name> [url] [file]\`\n* **Prefix:** \`${prefix}emoji add <name> [url]\` (or upload image and type \`${prefix}emoji add <name>\`)\n* **Shortcut:** \`${prefix}addemoji <name>\``,
        inline: false
      },
      {
        name: '🗑️ Delete Emoji',
        value: `* **Slash:** \`/emoji delete emoji: <emoji>\`\n* **Prefix:** \`${prefix}emoji delete <emoji>\`\n* **Shortcut:** \`${prefix}delemoji <emoji>\``,
        inline: false
      },
      {
        name: '✏️ Rename Emoji',
        value: `* **Slash:** \`/emoji rename emoji: <emoji> new_name: <name>\`\n* **Prefix:** \`${prefix}emoji rename <emoji> <new_name>\`\n* **Shortcut:** \`${prefix}renameemoji <emoji> <new_name>\``,
        inline: false
      },
      {
        name: '📋 List Emojis',
        value: `* **Slash:** \`/emoji list\`\n* **Prefix:** \`${prefix}emoji list\`\n* **Shortcut:** \`${prefix}listemoji\` or \`${prefix}emojis\``,
        inline: false
      },
      {
        name: 'ℹ️ Emoji Info',
        value: `* **Slash:** \`/emoji info emoji: <emoji>\`\n* **Prefix:** \`${prefix}emoji info <emoji>\`\n* **Shortcut:** \`${prefix}infoemoji <emoji>\``,
        inline: false
      },
      {
        name: '🥷 Steal Emoji',
        value: `* **Slash:** \`/emoji steal emoji_or_message: <emoji_or_message_url>\`\n* **Prefix:** \`${prefix}emoji steal <emoji_or_message_url>\`\n* **Shortcut:** \`${prefix}stealemoji <emoji_or_message_url>\``,
        inline: false
      },
      {
        name: '🔒 Restrict Emoji (Role Lock)',
        value: `* **Slash:** \`/emoji restrict emoji: <emoji> [role]\`\n* **Prefix:** \`${prefix}emoji restrict <emoji> [@role]\` (leave role blank to clear)\n* **Shortcut:** \`${prefix}restrictemoji <emoji> [@role]\``,
        inline: false
      },
      {
        name: '💡 Suggest Emoji',
        value: `* **Slash:** \`/emoji suggest name: <name> [url/emoji] [file]\`\n* **Prefix:** \`${prefix}emoji suggest <name> [url/emoji]\`\n* **Shortcut:** \`${prefix}suggestemoji <name>\``,
        inline: false
      },
      {
        name: '📊 Inactive Emojis',
        value: `* **Slash:** \`/emoji inactive [min_uses] [inactive_days]\`\n* **Prefix:** \`${prefix}emoji inactive [min_uses] [inactive_days]\`\n* **Shortcut:** \`${prefix}inactiveemoji\``,
        inline: false
      },
      {
        name: '🗑️ Prune Emojis (Admin Only)',
        value: `* **Slash:** \`/emoji prune [min_uses] [inactive_days]\`\n* **Prefix:** \`${prefix}emoji prune [min_uses] [inactive_days]\`\n* **Shortcut:** \`${prefix}pruneemoji\``,
        inline: false
      },
      {
        name: '🔍 Web Search Emojis',
        value: `* **Slash:** \`/emoji websearch query: <query>\`\n* **Prefix:** \`${prefix}emoji websearch <query>\`\n* **Shortcut:** \`${prefix}websearchemoji\``,
        inline: false
      },
      {
        name: '⚙️ Config Suggestions (Admin)',
        value: `* **Slash:** \`/emoji config [channel] [approve] [reject]\`\n* **Prefix:** \`${prefix}emoji config channel <#channel/clear>\` or \`approve <emoji>\` or \`reject <emoji>\``,
        inline: false
      }
    )
    .setFooter({ text: 'Note: Users need the "Manage Expressions" (or Manage Emojis and Stickers) permission to manage server emojis directly.' });
}

module.exports = {
  name: 'emoji',
  aliases: ['addemoji', 'delemoji', 'deleteemoji', 'renameemoji', 'listemoji', 'emojis', 'infoemoji', 'stealemoji', 'restrictemoji', 'suggestemoji', 'configemoji', 'searchemoji', 'inactiveemoji', 'pruneemoji', 'websearchemoji'],
  description: 'Quản lý emoji của server (Manage guild emojis)',
  parseEmojiInputToUrl,
  downloadImage,
  createEmojiFromUrl,
  handleSuggest,
  handleConfig,
  handleInactive,
  handlePrune,
  handleWebSearch,
  async execute(message, args) {
    const db = require('../../database');
    const config = require('../../config');

    const guildRow = message.guild ? await db.getGuild(message.guild.id) : null;
    const prefix = guildRow?.prefix || config.PREFIX;

    // Detect alias / command invoked
    let invokedCommand = '';
    if (message.content.startsWith(prefix)) {
      const contentWithoutPrefix = message.content.slice(prefix.length).trim();
      invokedCommand = contentWithoutPrefix.split(/ +/)[0].toLowerCase();
    } else if (message.content.startsWith('$')) {
      const contentWithoutPrefix = message.content.slice(1).trim();
      invokedCommand = contentWithoutPrefix.split(/ +/)[0].toLowerCase();
    }

    // Adapt shortcut aliases
    if (invokedCommand === 'addemoji') {
      args = ['add', ...args];
    } else if (invokedCommand === 'delemoji' || invokedCommand === 'deleteemoji') {
      args = ['delete', ...args];
    } else if (invokedCommand === 'renameemoji') {
      args = ['rename', ...args];
    } else if (invokedCommand === 'listemoji' || invokedCommand === 'emojis') {
      args = ['list', ...args];
    } else if (invokedCommand === 'infoemoji') {
      args = ['info', ...args];
    } else if (invokedCommand === 'stealemoji') {
      args = ['steal', ...args];
    } else if (invokedCommand === 'restrictemoji') {
      args = ['restrict', ...args];
    } else if (invokedCommand === 'suggestemoji') {
      args = ['suggest', ...args];
    } else if (invokedCommand === 'configemoji') {
      args = ['config', ...args];
    } else if (invokedCommand === 'searchemoji') {
      args = ['search', ...args];
    } else if (invokedCommand === 'inactiveemoji') {
      args = ['inactive', ...args];
    } else if (invokedCommand === 'pruneemoji') {
      args = ['prune', ...args];
    } else if (invokedCommand === 'websearchemoji') {
      args = ['websearch', ...args];
    }

    const subcommand = args[0]?.toLowerCase();
    const guild = message.guild;

    // Subcommands that require ManageExpressions permission
    const adminSubcommands = ['add', 'delete', 'rename', 'steal', 'restrict', 'config', 'prune'];
    if (adminSubcommands.includes(subcommand)) {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
        const errEmbed = new EmbedBuilder()
          .setColor(COLOR_ERROR)
          .setTitle('❌ Permission Denied')
          .setDescription('You need the `Manage Expressions` (or `Manage Emojis and Stickers`) permission to use this command.');
        return message.reply({ embeds: [errEmbed] });
      }
    }

    if (!subcommand || subcommand === 'help') {
      const helpEmbed = handleHelp(prefix);
      return message.reply({ embeds: [helpEmbed] });
    }

    // Try to trigger typing indicator
    if (message.channel && typeof message.channel.sendTyping === 'function') {
      await message.channel.sendTyping().catch(() => {});
    }

    try {
      let embed;

      if (subcommand === 'add') {
        const name = args[1];
        let source = args[2];
        const attachment = message.attachments ? message.attachments.first() : null;

        if (!source && attachment) {
          source = attachment.url;
        }

        if (!name) {
          throw new Error(`Usage: \`${prefix}emoji add <name> <emoji_or_url>\` (or upload an attachment and type \`${prefix}emoji add <name>\`)`);
        }
        if (!source) {
          throw new Error('You must provide a custom emoji, image URL, or upload an attachment.');
        }

        embed = await handleAdd(guild, name, source);
      }
      else if (subcommand === 'delete') {
        const emojiQuery = args[1];
        if (!emojiQuery) {
          throw new Error(`Usage: \`${prefix}emoji delete <emoji_name_id_or_symbol>\``);
        }
        embed = await handleDelete(guild, emojiQuery);
      }
      else if (subcommand === 'rename') {
        const emojiQuery = args[1];
        const newName = args[2];
        if (!emojiQuery || !newName) {
          throw new Error(`Usage: \`${prefix}emoji rename <old_emoji> <new_name>\``);
        }
        embed = await handleRename(guild, emojiQuery, newName);
      }
      else if (subcommand === 'list') {
        embed = await handleList(guild);
      }
      else if (subcommand === 'info') {
        const emojiQuery = args[1];
        if (!emojiQuery) {
          throw new Error(`Usage: \`${prefix}emoji info <emoji>\``);
        }
        embed = await handleInfo(guild, emojiQuery);
      }
      else if (subcommand === 'steal') {
        const query = args[1];
        if (!query) {
          throw new Error(`Usage: \`${prefix}emoji steal <emoji_or_message_url>\``);
        }
        embed = await handleSteal(guild, query);
      }
      else if (subcommand === 'restrict') {
        const emojiQuery = args[1];
        const roleQuery = args[2];

        if (!emojiQuery) {
          throw new Error(`Usage: \`${prefix}emoji restrict <emoji> [@role_or_id_or_name]\``);
        }

        let role = null;
        if (roleQuery) {
          const roleIdMatch = roleQuery.match(/^<@&(\d+)>$/);
          if (roleIdMatch) {
            role = guild.roles.cache.get(roleIdMatch[1]);
          } else if (/^\d+$/.test(roleQuery)) {
            role = guild.roles.cache.get(roleQuery);
          } else {
            role = guild.roles.cache.find(r => r.name.toLowerCase() === roleQuery.toLowerCase());
          }

          if (!role) {
            throw new Error(`Could not find role matching \`${roleQuery}\`.`);
          }
        }

        embed = await handleRestrict(guild, emojiQuery, role);
      }
      else if (subcommand === 'suggest') {
        const name = args[1];
        let url = args[2];
        const attachment = message.attachments ? message.attachments.first() : null;

        if (!url && attachment) {
          url = attachment.url;
        }

        if (!name) {
          throw new Error(`Usage: \`${prefix}emoji suggest <name> [url/emoji]\` (or upload an attachment and type \`${prefix}emoji suggest <name>\`)`);
        }
        if (!url) {
          throw new Error('You must provide a URL, custom emoji, Unicode emoji, or upload an image attachment.');
        }

        embed = await handleSuggest(guild, name, url, message.author);
      }
      else if (subcommand === 'config') {
        let channelQuery = null;
        let approveQuery = null;
        let rejectQuery = null;

        if (args[1] && ['channel', 'approve', 'reject'].includes(args[1].toLowerCase())) {
          const key = args[1].toLowerCase();
          const value = args[2];
          if (!value) {
            throw new Error(`Usage: \`${prefix}emoji config channel <#channel/clear>\` or \`approve <emoji>\` or \`reject <emoji>\``);
          }
          if (key === 'channel') channelQuery = value;
          else if (key === 'approve') approveQuery = value;
          else if (key === 'reject') rejectQuery = value;
        } else {
          channelQuery = args[1] || null;
          approveQuery = args[2] || null;
          rejectQuery = args[3] || null;
        }

        embed = await handleConfig(guild, channelQuery, approveQuery, rejectQuery);
      }
      else if (subcommand === 'search') {
        const query = args[1];
        if (!query) {
          throw new Error(`Usage: \`${prefix}emoji search <pepe_cat_logo_etc>\``);
        }
        const searchResult = await handleSearch(guild, query, prefix);
        return message.reply(searchResult);
      }
      else if (subcommand === 'inactive') {
        const minUses = args[1] ? parseInt(args[1]) : 5;
        const inactiveDays = args[2] ? parseInt(args[2]) : 30;
        embed = await handleInactive(guild, minUses, inactiveDays);
      }
      else if (subcommand === 'prune') {
        const minUses = args[1] ? parseInt(args[1]) : 5;
        const inactiveDays = args[2] ? parseInt(args[2]) : 30;
        embed = await handlePrune(guild, minUses, inactiveDays);
      }
      else if (subcommand === 'websearch') {
        const query = args[1];
        if (!query) {
          throw new Error(`Usage: \`${prefix}emoji websearch <query>\``);
        }
        const searchResult = await handleWebSearch(guild, query, prefix);
        return message.reply(searchResult);
      }
      else {
        throw new Error(`Unknown subcommand \`${subcommand}\`. Type \`${prefix}emoji\` for help.`);
      }

      await message.reply({ embeds: [embed] });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor(COLOR_ERROR)
        .setTitle('❌ Error')
        .setDescription(error.message);
      await message.reply({ embeds: [errorEmbed] });
    }
  }
};

