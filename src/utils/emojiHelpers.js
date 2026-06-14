const { URL } = require('url');
const axios = require('axios');

// Embed Colors
const COLOR_SUCCESS = 0x57F287; // Discord Green
const COLOR_ERROR = 0xED4245; // Discord Red
const COLOR_INFO = 0x5865F2; // Discord Blurple

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
  const filtered = codePoints.filter(cp => cp !== 'fe0f');
  return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/' + filtered.join('-') + '.png';
}

function parseEmojiInputToUrl(query) {
  if (!query || typeof query !== 'string') return null;
  if (/^https?:\/\//i.test(query)) return query;

  const customEmojiMatch = query.match(/<(a)?:(\w+):(\d+)>/);
  if (customEmojiMatch) {
    const animated = !!customEmojiMatch[1];
    const id = customEmojiMatch[3];
    return 'https://cdn.discordapp.com/emojis/' + id + '.' + (animated ? 'gif' : 'png');
  }

  if (isUnicodeEmoji(query)) {
    return emojiToTwemojiUrl(query);
  }

  return null;
}

function resolveEmoji(guild, query) {
  if (!query || !guild) return null;

  const customEmojiMatch = query.match(/<(a)?:(\w+):(\d+)>/);
  if (customEmojiMatch) {
    const id = customEmojiMatch[3];
    return guild.emojis.cache.get(id) || { id, name: customEmojiMatch[2], animated: !!customEmojiMatch[1], isExternal: true };
  }

  if (/^\d+$/.test(query)) {
    const emoji = guild.emojis.cache.get(query);
    if (emoji) return emoji;
  }

  return guild.emojis.cache.find(e => e.name.toLowerCase() === query.toLowerCase()) || null;
}

async function downloadImage(url) {
  let targetUrl = url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    throw new Error('Invalid URL or emoji source.');
  }

  if (targetUrl.includes('//localhost')) {
    targetUrl = targetUrl.replace('//localhost', '//127.0.0.1');
  }

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
}

async function resolveStealTarget(guild, emojiOrMsgUrl) {
  if (!emojiOrMsgUrl) {
    throw new Error('Invalid format. Please supply a custom emoji (e.g., <:name:id>), a URL, or a Discord message link.');
  }

  const msgUrlMatch = emojiOrMsgUrl.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (msgUrlMatch) {
    const channelId = msgUrlMatch[2];
    const messageId = msgUrlMatch[3];

    const channel = await guild.client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      throw new Error('Could not access channel with ID ' + channelId + ' (ensure the bot can see that channel).');
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      throw new Error('Could not find message with ID ' + messageId + ' in channel <#' + channelId + '>.');
    }

    const emojiMatch = message.content.match(/<(a)?:(\w+):(\d+)>/);
    if (!emojiMatch) {
      throw new Error('No custom emojis were found in the specified message.');
    }

    const animated = !!emojiMatch[1];
    const name = emojiMatch[2];
    const id = emojiMatch[3];
    const url = 'https://cdn.discordapp.com/emojis/' + id + '.' + (animated ? 'gif' : 'png');
    return { url, name, animated };
  }

  const emojiMatch = emojiOrMsgUrl.match(/<(a)?:(\w+):(\d+)>/);
  if (emojiMatch) {
    const animated = !!emojiMatch[1];
    const name = emojiMatch[2];
    const id = emojiMatch[3];
    const url = 'https://cdn.discordapp.com/emojis/' + id + '.' + (animated ? 'gif' : 'png');
    return { url, name, animated };
  }

  if (isValidUrl(emojiOrMsgUrl)) {
    return { url: emojiOrMsgUrl, name: null, animated: false };
  }

  if (isUnicodeEmoji(emojiOrMsgUrl)) {
    return { url: emojiToTwemojiUrl(emojiOrMsgUrl), name: null, animated: false };
  }

  throw new Error('Invalid format. Please supply a custom emoji (e.g., <:name:id>), a URL, or a Discord message link.');
}

async function createEmojiFromUrl(guild, name, url) {
  const targetUrl = parseEmojiInputToUrl(url) || url;
  const { buffer } = await downloadImage(targetUrl);
  return await guild.emojis.create({ attachment: buffer, name });
}

module.exports = {
  COLOR_SUCCESS,
  COLOR_ERROR,
  COLOR_INFO,
  isValidUrl,
  isUnicodeEmoji,
  emojiToTwemojiUrl,
  parseEmojiInputToUrl,
  resolveEmoji,
  downloadImage,
  resolveStealTarget,
  createEmojiFromUrl,
};
