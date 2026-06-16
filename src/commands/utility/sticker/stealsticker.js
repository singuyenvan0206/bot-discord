const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLOR_SUCCESS } = require('../../../utils/emojiHelpers');
const db = require('../../../database');
const config = require('../../../config');
const suggestSticker = require('./suggeststicker');
const axios = require('axios');

async function downloadStickerImage(url) {
  let targetUrl = url;
  if (targetUrl.includes('//localhost')) {
    targetUrl = targetUrl.replace('//localhost', '//127.0.0.1');
  }
  const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');
  if (buffer.length > 512 * 1024) {
    throw new Error('Kích thước ảnh vượt quá giới hạn 512 KB của sticker Discord.');
  }
  return buffer;
}

module.exports = {
  name: 'stealsticker',
  aliases: ['stealsticker'],
  description: 'Thêm sticker từ tin nhắn khác (Steal a sticker from a message)',
  async execute(message, args) {
    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'steal') {
      commandArgs = args.slice(1);
    }

    const guild = message.guild;
    const prefix = config.PREFIX;

    let targetStickerUrl = null;
    let targetStickerName = null;
    let targetStickerTags = '✨';

    // 1. Check if message is a reply
    if (message.reference && message.reference.messageId) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedMsg.stickers && repliedMsg.stickers.size > 0) {
          const sticker = repliedMsg.stickers.first();
          targetStickerUrl = sticker.url;
          targetStickerName = sticker.name.replace(/[^\w]/g, '_').toLowerCase();
          // Read tags if available
          targetStickerTags = sticker.tags?.join(', ') || '✨';
        }
      } catch (err) {
        console.error('Failed to fetch replied message for sticker steal:', err);
      }
    }

    // 2. Parse arguments
    let textArg = commandArgs.join(' ');
    const msgUrlMatch = textArg.match(/channels\/(\d+)\/(\d+)\/(\d+)/);

    if (msgUrlMatch && !targetStickerUrl) {
      const channelId = msgUrlMatch[2];
      const messageId = msgUrlMatch[3];
      try {
        const targetChannel = await guild.client.channels.fetch(channelId).catch(() => null);
        if (targetChannel) {
          const targetMsg = await targetChannel.messages.fetch(messageId).catch(() => null);
          if (targetMsg && targetMsg.stickers && targetMsg.stickers.size > 0) {
            const sticker = targetMsg.stickers.first();
            targetStickerUrl = sticker.url;
            targetStickerName = sticker.name.replace(/[^\w]/g, '_').toLowerCase();
            targetStickerTags = sticker.tags?.join(', ') || '✨';
          }
        }
      } catch (err) {
        console.error('Failed to fetch linked message for sticker steal:', err);
      }
    }

    // Direct Image URL / Attachment check if not found in message
    if (!targetStickerUrl) {
      const attachment = message.attachments ? message.attachments.first() : null;
      if (attachment) {
        targetStickerUrl = attachment.url;
        targetStickerName = commandArgs[0] || attachment.name.replace(/\.[^/.]+$/, '').replace(/[^\w]/g, '_').toLowerCase();
        targetStickerTags = commandArgs[1] || '✨';
      } else if (commandArgs[0] && /^https?:\/\//i.test(commandArgs[0])) {
        targetStickerUrl = commandArgs[0];
        targetStickerName = commandArgs[1] || 'custom_sticker';
        targetStickerTags = commandArgs[2] || '✨';
      } else if (commandArgs[1] && /^https?:\/\//i.test(commandArgs[1])) {
        targetStickerName = commandArgs[0];
        targetStickerUrl = commandArgs[1];
        targetStickerTags = commandArgs[2] || '✨';
      }
    }

    if (!targetStickerUrl) {
      throw new Error(`Usage: \nReply to a message containing a sticker with: \`${prefix}sticker steal [name] [tags]\`\nOr provide link: \`${prefix}sticker steal <message_url> [name] [tags]\`\nOr upload file: \`${prefix}sticker steal <name> <tags>\``);
    }

    // Apply custom name/tags override if specified in args (when replies are used)
    if (commandArgs[0] && !/^https?:\/\//i.test(commandArgs[0]) && !commandArgs[0].includes('channels/')) {
      targetStickerName = commandArgs[0];
      if (commandArgs[1]) {
        targetStickerTags = commandArgs[1];
      }
    }

    if (!targetStickerName || !/^[a-zA-Z0-9_]{2,30}$/.test(targetStickerName)) {
      targetStickerName = `sticker_${Date.now().toString().slice(-6)}`;
    }

    const isBotOwner = await db.isOwner(message.author.id);
    let embed;
    if (isBotOwner || message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      const buffer = await downloadStickerImage(targetStickerUrl);
      
      const newSticker = await guild.stickers.create({ 
        file: buffer, 
        name: targetStickerName, 
        tags: targetStickerTags,
        description: 'Stolen using bot'
      });

      embed = new EmbedBuilder()
        .setColor(COLOR_SUCCESS)
        .setTitle('🥷 Sticker Stolen')
        .setDescription(`Successfully stolen and added sticker: **${newSticker.name}**`)
        .addFields(
          { name: 'Name', value: `\`${newSticker.name}\``, inline: true },
          { name: 'ID', value: `\`${newSticker.id}\``, inline: true },
          { name: 'Tags', value: targetStickerTags, inline: true }
        )
        .setThumbnail(newSticker.url);

      if (message.reply) {
        await message.reply({ embeds: [embed] });
      }
    } else {
      // Suggest instead of steal if user lacks permission
      embed = await suggestSticker.handleStickerSuggest(
        guild, 
        targetStickerName, 
        targetStickerTags, 
        targetStickerUrl, 
        message.author, 
        message.channel
      );
      if (embed && message.reply) {
        await message.reply({ embeds: [embed] });
      }
    }

    return embed;
  }
};
