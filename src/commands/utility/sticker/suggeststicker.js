const { EmbedBuilder } = require('discord.js');
const { COLOR_SUCCESS, COLOR_INFO, parseEmojiInputToUrl } = require('../../../utils/emojiHelpers');
const db = require('../../../database');
const config = require('../../../config');

async function getStickerSuggestChannel(guild) {
  let channelId = await db.getGuildSetting(guild.id, 'sticker_suggest_channel');
  if (channelId) {
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (channel) return channel;
  }
  let fallbackChannel = guild.channels.cache.find(
    c => c.name.toLowerCase().includes('đề-xuất-sticker') || c.name.toLowerCase().includes('de-xuat-sticker')
  );
  if (fallbackChannel) return fallbackChannel;

  // Fallback to emoji suggest channel settings
  channelId = await db.getGuildSetting(guild.id, 'emoji_suggest_channel');
  if (channelId) {
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (channel) return channel;
  }
  fallbackChannel = guild.channels.cache.find(
    c => c.name.toLowerCase().includes('đề-xuất-emoji') || c.name.toLowerCase().includes('de-xuat-emoji')
  );
  return fallbackChannel || null;
}

async function handleStickerSuggest(guild, name, tags, source, user, messageChannel) {
  if (!name || !/^[a-zA-Z0-9_]{2,30}$/.test(name)) {
    throw new Error('Sticker name must be alphanumeric (underscores allowed) and between 2 and 30 characters.');
  }

  if (!tags) {
    throw new Error('You must provide at least one unicode emoji as tags for this sticker.');
  }

  const targetUrl = parseEmojiInputToUrl(source) || source;
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    throw new Error('Invalid sticker source. Please provide a direct image URL or upload an attachment.');
  }

  const suggestChannel = await getStickerSuggestChannel(guild);
  const approveReaction = await db.getGuildSetting(guild.id, 'sticker_approve_reaction', '✅');
  const rejectReaction = await db.getGuildSetting(guild.id, 'sticker_reject_reaction', '❌');

  const embed = new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle('💡 Sticker Suggestion')
    .setDescription(`${user} suggested a new custom sticker. Admins can review and approve it.\nBiểu cảm duyệt: ${approveReaction} | Từ chối: ${rejectReaction}`)
    .addFields(
      { name: 'Suggested Name', value: `\`${name}\``, inline: true },
      { name: 'Unicode Tags', value: tags, inline: true },
      { name: 'Suggested By', value: `${user}`, inline: true }
    )
    .setImage(targetUrl)
    .setFooter({ text: `Source: ${targetUrl} | Name: ${name} | Tags: ${tags} | Type: sticker` });

  const targetChannel = suggestChannel || messageChannel;
  const suggestMsg = await targetChannel.send({ embeds: [embed] });
  await suggestMsg.react('👍').catch(() => {});
  await suggestMsg.react('👎').catch(() => {});

  if (targetChannel.id === messageChannel.id) {
    return null;
  }

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('✅ Sticker Suggestion Submitted')
    .setDescription(`Your sticker suggestion has been posted to ${targetChannel}.`);
}

module.exports = {
  name: 'suggeststicker',
  aliases: ['suggeststicker'],
  description: 'Đề xuất sticker mới cho server (Suggest a new sticker)',
  getStickerSuggestChannel,
  handleStickerSuggest,
  async execute(message, args) {
    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'suggest') {
      commandArgs = args.slice(1);
    }

    const name = commandArgs[0];
    const tags = commandArgs[1] || '✨';
    let source = commandArgs[2];
    const attachment = message.attachments ? message.attachments.first() : null;

    if (!source && attachment) {
      source = attachment.url;
    }

    const prefix = config.PREFIX;
    if (!name) {
      throw new Error(`Usage: ${prefix}sticker suggest <name> [tags] [url] (or upload an attachment and use ${prefix}sticker suggest <name> [tags])`);
    }
    if (!source) {
      throw new Error('You must provide an image URL or upload an attachment for the sticker.');
    }

    const guild = message.guild;
    const embed = await handleStickerSuggest(guild, name, tags, source, message.author, message.channel);

    if (embed && message.reply) {
      await message.reply({ embeds: [embed] });
    }
    return embed;
  }
};
