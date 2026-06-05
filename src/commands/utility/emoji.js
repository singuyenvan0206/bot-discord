const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

// Embed Colors
const COLOR_SUCCESS = 0x57F287; // Discord Green
const COLOR_ERROR = 0xED4245; // Discord Red
const COLOR_INFO = 0x5865F2; // Discord Blurple



// Helper: Convert Unicode emoji, custom emoji, or URL to a valid image URL
function parseEmojiInputToUrl(query) {
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

// Helper: Parse a custom emoji string to a CDN URL
function parseEmojiSource(query) {
  if (!query) return null;
  const customEmojiMatch = query.match(/<(a)?:(\w+):(\d+)>/);
  if (!customEmojiMatch) return null;

  const animated = !!customEmojiMatch[1];
  const name = customEmojiMatch[2];
  const id = customEmojiMatch[3];
  const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;

  return { url, name, animated };
}

function isValidUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isUnicodeEmoji(value) {
  return typeof value === 'string' && /\p{Emoji}/u.test(value);
}

function emojiToTwemojiUrl(emoji) {
  const codePoints = [...emoji].map(char => char.codePointAt(0).toString(16));
  return `https://twemoji.maxcdn.com/v/latest/72x72/${codePoints.join('-')}.png`;
}

// Helper: Resolve emoji or message URL into a target image source
async function resolveStealTarget(guild, emojiOrMsgUrl) {
  if (!emojiOrMsgUrl) {
    throw new Error('Invalid format. Please supply a custom emoji (e.g., `<:name:id>`) or a Discord message link.');
  }

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

    const animated = !!emojiMatch[1];
    const name = emojiMatch[2];
    const id = emojiMatch[3];
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;

    return { url, name, animated };
  }

  const emojiMatch = emojiOrMsgUrl.match(/<(a)?:(\w+):(\d+)>/);
  if (emojiMatch) {
    const animated = !!emojiMatch[1];
    const name = emojiMatch[2];
    const id = emojiMatch[3];
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
    return { url, name, animated };
  }

  if (isValidUrl(emojiOrMsgUrl)) {
    return { url: emojiOrMsgUrl, name: null, animated: false };
  }

  if (isUnicodeEmoji(emojiOrMsgUrl)) {
    return { url: emojiToTwemojiUrl(emojiOrMsgUrl), name: null, animated: false };
  }

  throw new Error('Invalid format. Please supply a custom emoji (e.g., `<:name:id>`) or a Discord message link.');
}

// Helper: Download image and return buffer
async function downloadImage(url) {
  let targetUrl = url;
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



// 6. STEAL EMOJI
async function handleSteal(guild, emojiOrMsgUrl, customName = null) {
  const { url: targetUrl, name: sourceName } = await resolveStealTarget(guild, emojiOrMsgUrl);
  const { buffer } = await downloadImage(targetUrl);
  const name = customName || sourceName || 'stolen_emoji';
  const newEmoji = await guild.emojis.create({ attachment: buffer, name });

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

async function handleStealSuggestion(guild, emojiOrMsgUrl, author, currentChannel, customName = null) {
  const { url: targetUrl, name: sourceName } = await resolveStealTarget(guild, emojiOrMsgUrl);
  const channel = await getSuggestChannel(guild);
  if (!channel) {
    throw new Error('Emoji suggestion channel is not configured, and no channel named `đề-xuất-emoji` was found in this server.');
  }

  const db = require('../../database');
  const approveEmoji = await db.getGuildSetting(guild.id, 'emoji_approve_reaction', '✅');
  const rejectEmoji = await db.getGuildSetting(guild.id, 'emoji_reject_reaction', '❌');
  const name = customName || sourceName || 'stolen_emoji';
  const isSameChannel = currentChannel?.id === channel.id;

  const embed = new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle('💡 Đề Xuất Emoji Từ Người Dùng')
    .setDescription(`Người dùng ${author} đã đề xuất một emoji để thêm vào server.`)
    .addFields(
      { name: 'Tên Emoji', value: `\`:${name}:\``, inline: true },
      { name: 'Nguồn', value: emojiOrMsgUrl, inline: true }
    )
    .setImage(targetUrl)
    .setFooter({ text: `Suggested by ${author.tag || author.username}` });

  if (!isSameChannel) {
    const suggestMsg = await channel.send({ embeds: [embed] });
    await suggestMsg.react(approveEmoji).catch(() => {});
    await suggestMsg.react(rejectEmoji).catch(() => {});
  }

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('✅ Đã Gửi Đề Xuất Emoji')
    .setDescription(isSameChannel
      ? 'Bạn chưa có quyền quản lý emoji. Đề xuất đã được ghi nhận trong kênh hiện tại.'
      : `Bạn chưa có quyền quản lý emoji, nên đề xuất đã được gửi đến kênh ${channel}.`)
    .addFields(
      { name: 'Tên Emoji', value: `\`:${name}:\``, inline: true },
      { name: 'Kênh Đề Xuất', value: `${channel}`, inline: true }
    );
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
  await suggestMsg.react(approveEmoji).catch(() => {});
  await suggestMsg.react(rejectEmoji).catch(() => {});

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('✅ Đã Gửi Đề Xuất')
    .setDescription(`Đề xuất emoji của bạn đã được gửi thành công đến kênh ${channel}!`);
}

// 10. CONFIG SUGGESTIONS
async function handleConfig(guild, channelQuery, approveQuery, rejectQuery, autoSuggestQuery, autoPruneQuery, pruneMinUsesQuery, pruneInactiveDaysQuery) {
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

  if (autoSuggestQuery) {
    const val = autoSuggestQuery.toLowerCase() === 'true' ? 'true' : 'false';
    await db.setGuildSetting(guild.id, 'emoji_auto_suggest', val);
    description += `• Gợi ý tự động: ${val === 'true' ? '✅ Bật' : '❌ Tắt'}\n`;
  }

  if (autoPruneQuery) {
    const val = autoPruneQuery.toLowerCase() === 'true' ? 'true' : 'false';
    await db.setGuildSetting(guild.id, 'emoji_auto_prune', val);
    description += `• Dọn dẹp tự động: ${val === 'true' ? '✅ Bật' : '❌ Tắt'}\n`;
  }

  if (pruneMinUsesQuery) {
    const minUsesInt = parseInt(pruneMinUsesQuery);
    if (isNaN(minUsesInt) || minUsesInt < 0) {
        throw new Error('Số lượt dùng tối thiểu (prune_min_uses) phải là một số nguyên dương.');
    }
    await db.setGuildSetting(guild.id, 'emoji_prune_min_uses', String(minUsesInt));
    description += `• Lượt dùng tối thiểu để dọn dẹp: \`${minUsesInt}\` lượt\n`;
  }

  if (pruneInactiveDaysQuery) {
    const inactiveDaysInt = parseInt(pruneInactiveDaysQuery);
    if (isNaN(inactiveDaysInt) || inactiveDaysInt < 0) {
        throw new Error('Số ngày không hoạt động (prune_inactive_days) phải là một số nguyên dương.');
    }
    await db.setGuildSetting(guild.id, 'emoji_prune_inactive_days', String(inactiveDaysInt));
    description += `• Số ngày không hoạt động để dọn dẹp: \`${inactiveDaysInt}\` ngày\n`;
  }

  if (!description) {
    const channelId = await db.getGuildSetting(guild.id, 'emoji_suggest_channel');
    const approve = await db.getGuildSetting(guild.id, 'emoji_approve_reaction', '✅');
    const reject = await db.getGuildSetting(guild.id, 'emoji_reject_reaction', '❌');
    const autoSuggest = await db.getGuildSetting(guild.id, 'emoji_auto_suggest', 'false');
    const autoPrune = await db.getGuildSetting(guild.id, 'emoji_auto_prune', 'false');
    const minUses = await db.getGuildSetting(guild.id, 'emoji_prune_min_uses', '5');
    const inactiveDays = await db.getGuildSetting(guild.id, 'emoji_prune_inactive_days', '30');
    
    description = `• Kênh đề xuất: ${channelId ? `<#${channelId}>` : '*Chưa cấu hình (mặc định tìm theo tên)*'}\n` +
                  `• Biểu cảm duyệt: ${approve}\n` +
                  `• Biểu cảm từ chối: ${reject}\n` +
                  `• Gợi ý tự động (auto_suggest): ${autoSuggest === 'true' ? '✅ Bật' : '❌ Tắt'}\n` +
                  `• Dọn dẹp tự động (auto_prune): ${autoPrune === 'true' ? '✅ Bật' : '❌ Tắt'}\n` +
                  `• Lượt dùng tối thiểu để dọn dẹp (prune_min_uses): \`${minUses}\` lượt\n` +
                  `• Số ngày không hoạt động để dọn dẹp (prune_inactive_days): \`${inactiveDays}\` ngày\n`;
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
async function handleInactive(guild, minUses = null, inactiveDays = null) {
  const db = require('../../database');
  if (minUses === null || minUses === undefined) {
    const dbMin = await db.getGuildSetting(guild.id, 'emoji_prune_min_uses', '5');
    minUses = parseInt(dbMin) || 5;
  }
  if (inactiveDays === null || inactiveDays === undefined) {
    const dbInactive = await db.getGuildSetting(guild.id, 'emoji_prune_inactive_days', '30');
    inactiveDays = parseInt(dbInactive) || 30;
  }
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

    if (!stat) {
      // Seed the database with initial tracking stats to prevent instant listing as inactive
      db.execute(`
        INSERT INTO emoji_stats (guild_id, emoji_id, use_count, last_used_at)
        VALUES (?, ?, 0, ?)
        ON CONFLICT(guild_id, emoji_id) DO NOTHING
      `, [guild.id, id, now]).catch(() => {});
    }

    const emojiAgeMs = now - emoji.createdTimestamp;
    const trackerAgeMs = now - lastUsed;

    let isInactive = false;
    // Only flag as inactive if both the emoji age and tracking duration are older than threshold
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

  // Sort by usage count (lowest first), then last used (oldest first)
  inactiveList.sort((a, b) => {
    if (a.useCount !== b.useCount) return a.useCount - b.useCount;
    return a.lastUsed - b.lastUsed;
  });

  if (inactiveList.length === 0) {
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
        name: '🔒 Restrict Emoji (Role Lock)',
        value: `* **Slash:** \`/emoji restrict emoji: <emoji> [role]\`\n* **Prefix:** \`${prefix}emoji restrict <emoji> [@role]\` (leave role blank to clear)\n* **Shortcut:** \`${prefix}restrictemoji <emoji> [@role]\``,
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
        value: `* **Slash:** \`/emoji steal emoji_or_message: <emoji_or_message_url>\`\n* **Prefix:** \`${prefix}emoji steal <emoji_or_message_url>\` or \`${prefix}emoji steal <name> <emoji_or_message_url>\`\n* **Shortcut:** \`${prefix}stealemoji <emoji_or_message_url>\``,
        inline: false
      },
      {
        name: '⚙️ Config Suggestions (Admin)',
        value: `* **Slash:** \`/emoji config [channel] [approve] [reject] [auto_suggest] [auto_prune] [prune_min_uses] [prune_inactive_days]\`\n* **Prefix:** \`${prefix}emoji config channel <#channel/clear>\` or \`auto_suggest <true/false>\` or \`prune_min_uses <count>\``,
        inline: false
      }
    )
    .setFooter({ text: 'Note: Users need the "Manage Expressions" (or Manage Emojis and Stickers) permission to manage emojis.' });
}

module.exports = {
  name: 'emoji',
  aliases: ['stealemoji', 'suggestemoji', 'configemoji', 'searchemoji', 'inactiveemoji', 'pruneemoji', 'websearchemoji', 'autosuggestemoji'],
  description: 'Quản lý emoji của server (Manage guild emojis)',
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
    } else if (invokedCommand === 'autosuggestemoji') {
      args = ['autosuggest', ...args];
    }

    const subcommand = args[0]?.toLowerCase();
    const guild = message.guild;

    // Subcommands that require ManageExpressions permission
    const adminSubcommands = ['config', 'prune', 'autosuggest'];
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

          if (subcommand === 'steal') {
        if (args.length < 2) {
          throw new Error(`Usage: \`${prefix}emoji steal <emoji_or_message_url>\``);
        }

        const rawArgs = args.slice(1);
        let query = rawArgs.join(' ');
        let customName = null;

        try {
          await resolveStealTarget(guild, query);
        } catch (error) {
          if (rawArgs.length >= 2) {
            customName = rawArgs[0];
            query = rawArgs.slice(1).join(' ');
            await resolveStealTarget(guild, query);
          } else {
            throw error;
          }
        }

        if (message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
          embed = await handleSteal(guild, query, customName);
        } else {
          embed = await handleStealSuggestion(guild, query, message.author, message.channel, customName);
        }
      }
      else if (subcommand === 'suggest') {
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

