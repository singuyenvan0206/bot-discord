const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLOR_SUCCESS, resolveStealTarget, downloadImage } = require('../../../utils/emojiHelpers');
const config = require('../../../config');
const suggestemoji = require('./suggestemoji');
const db = require('../../../database');

module.exports = {
  name: 'stealemoji',
  aliases: ['stealemoji'],
  description: 'Thêm emoji từ server khác (Steal an emoji from another server)',
  async execute(message, args) {
    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'steal') {
      commandArgs = args.slice(1);
    }

    const prefix = config.PREFIX;
    if (commandArgs.length < 1) {
      throw new Error(`Usage: ${prefix}emoji steal <emoji_or_message_url> or ${prefix}emoji steal [custom_name] <emoji_or_message_url>`);
    }

    let query = commandArgs.join(' ');
    let customName = null;

    const guild = message.guild;

    try {
      await resolveStealTarget(guild, query);
    } catch (error) {
      if (commandArgs.length >= 2) {
        customName = commandArgs[0];
        query = commandArgs.slice(1).join(' ');
        await resolveStealTarget(guild, query);
      } else {
        throw error;
      }
    }

    const isBotOwner = await db.isOwner(message.author.id);
    let embed;
    if (isBotOwner || message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      const target = await resolveStealTarget(guild, query);
      const { buffer } = await downloadImage(target.url);
      const name = customName || target.name || 'stolen_emoji';
      const newEmoji = await guild.emojis.create({ attachment: buffer, name });

      embed = new EmbedBuilder()
        .setColor(COLOR_SUCCESS)
        .setTitle('🥷 Emoji Stolen')
        .setDescription('Successfully stolen and added emoji: ' + newEmoji)
        .addFields(
          { name: 'Name', value: ':' + newEmoji.name + ':', inline: true },
          { name: 'ID', value: '' + newEmoji.id + '', inline: true },
          { name: 'Type', value: newEmoji.animated ? 'Animated' : 'Static', inline: true }
        )
        .setThumbnail(newEmoji.url);

      if (message.reply) {
        await message.reply({ embeds: [embed] });
      }
    } else {
      // Suggest instead of steal if user lacks permission
      embed = await suggestemoji.execute(message, ['suggest', customName || 'emoji_suggestion', query]);
    }

    return embed;
  }
};
