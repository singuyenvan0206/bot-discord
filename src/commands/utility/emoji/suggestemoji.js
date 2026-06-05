const { EmbedBuilder } = require('discord.js');
const { COLOR_SUCCESS, COLOR_INFO, parseEmojiInputToUrl } = require('../../../utils/emojiHelpers');
const db = require('../../../database');
const config = require('../../../config');

async function getSuggestChannel(guild) {
  const channelId = await db.getGuildSetting(guild.id, 'emoji_suggest_channel');
  if (channelId) {
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (channel) return channel;
  }

  return guild.channels.cache.find(
    c => c.name.toLowerCase().includes('đề-xuất-emoji') || c.name.toLowerCase().includes('de-xuat-emoji')
  ) || null;
}

async function handleSuggest(guild, name, source, user, messageChannel) {
  if (!name || !/^\w{2,32}$/.test(name)) {
    throw new Error('Suggested emoji name must be alphanumeric (underscores allowed) and between 2 and 32 characters.');
  }

  const targetUrl = parseEmojiInputToUrl(source);
  if (!targetUrl) {
    throw new Error('Invalid source. Provide a direct image URL, custom emoji, or Unicode emoji.');
  }

  const suggestChannel = await getSuggestChannel(guild);
  const embed = new EmbedBuilder()
    .setColor(COLOR_INFO)
    .setTitle('💡 Emoji Suggestion')
    .setDescription(user + ' suggested a new emoji. Admins can review and add it.')
    .addFields(
      { name: 'Suggested Name', value: ':' + name + ':', inline: true },
      { name: 'Suggested By', value: '' + user, inline: true }
    )
    .setImage(targetUrl)
    .setFooter({ text: `Source: ${targetUrl} | Name: ${name}` }); // Fix: format to match messageReactionAdd regex

  const targetChannel = suggestChannel || messageChannel;
  await targetChannel.send({ embeds: [embed] });

  if (targetChannel.id === messageChannel.id) {
    return null;
  }

  return new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle('✅ Suggestion Submitted')
    .setDescription('Your emoji suggestion has been posted to ' + targetChannel + '.');
}

module.exports = {
  name: 'suggestemoji',
  aliases: ['suggestemoji'],
  description: 'Đề xuất emoji mới cho server (Suggest a new emoji to the server)',
  getSuggestChannel,
  handleSuggest,
  async execute(message, args) {
    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'suggest') {
      commandArgs = args.slice(1);
    }

    const name = commandArgs[0];
    let source = commandArgs[1];
    const attachment = message.attachments ? message.attachments.first() : null;

    if (!source && attachment) {
      source = attachment.url;
    }

    const prefix = config.PREFIX;
    if (!name) {
      throw new Error(`Usage: ${prefix}emoji suggest <name> <emoji_or_url> (or upload an attachment and type ${prefix}emoji suggest <name>)`);
    }
    if (!source) {
      throw new Error('You must provide a custom emoji, image URL, or upload an attachment.');
    }

    const guild = message.guild;
    const embed = await handleSuggest(guild, name, source, message.author, message.channel);

    if (embed && message.reply) {
      await message.reply({ embeds: [embed] });
    }
    return embed;
  }
};
