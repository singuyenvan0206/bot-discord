const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLOR_SUCCESS, COLOR_INFO } = require('../../../utils/emojiHelpers');
const db = require('../../../database');
const config = require('../../../config');

module.exports = {
  name: 'configsticker',
  aliases: ['configsticker'],
  description: 'Cài đặt đề xuất sticker (Configure sticker suggestion settings)',
  async execute(message, args) {
    const isBotOwner = await db.isOwner(message.author.id);
    if (!isBotOwner && !message.member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
      throw new Error('You need the Manage Emojis and Stickers permission to use this command.');
    }

    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'config') {
      commandArgs = args.slice(1);
    }

    const guild = message.guild;
    const prefix = config.PREFIX;

    const showConfig = async () => {
      const suggestChannelId = await db.getGuildSetting(guild.id, 'sticker_suggest_channel', null);
      const approveEmoji = await db.getGuildSetting(guild.id, 'sticker_approve_reaction', '✅');
      const rejectEmoji = await db.getGuildSetting(guild.id, 'sticker_reject_reaction', '❌');
      const autoSuggest = await db.getGuildSetting(guild.id, 'sticker_auto_suggest', 'false');

      const channelDisplay = suggestChannelId ? `<#${suggestChannelId}>` : '_Not configured (falls back to emoji channel)_';

      return new EmbedBuilder()
        .setColor(COLOR_INFO)
        .setTitle('⚙️ Sticker Configuration')
        .setDescription(`Manage sticker settings for **${guild.name}**. Use \`${prefix}sticker config <key> <value>\` to edit.`)
        .addFields(
          { name: 'Channel (`channel`)', value: channelDisplay, inline: true },
          { name: 'Approve Reaction (`approve`)', value: approveEmoji, inline: true },
          { name: 'Reject Reaction (`reject`)', value: rejectEmoji, inline: true },
          { name: 'Auto Suggest (`auto_suggest`)', value: (autoSuggest === true || autoSuggest === 'true') ? 'Enabled (True)' : 'Disabled (False)', inline: true }
        );
    };

    if (commandArgs.length === 0) {
      const embed = await showConfig();
      if (message.reply) {
        await message.reply({ embeds: [embed] });
      }
      return embed;
    }

    const validKeys = ['channel', 'approve', 'reject', 'auto_suggest'];
    const key = commandArgs[0]?.toLowerCase();

    if (commandArgs.length === 2 && validKeys.includes(key)) {
      let value = commandArgs[1];
      let dbKey = '';
      let displayValue = value;

      if (key === 'channel') {
        dbKey = 'sticker_suggest_channel';
        const match = value.match(/^<#(\d+)>$/) || value.match(/^(\d+)$/);
        if (match) {
          const channelId = match[1];
          const channel = guild.channels.cache.get(channelId);
          if (!channel) throw new Error('Could not find that channel in this server.');
          value = channelId;
          displayValue = `<#${channelId}>`;
        } else if (value.toLowerCase() === 'none' || value.toLowerCase() === 'null') {
          value = '';
          displayValue = 'Cleared (Using emoji channel fallback)';
        } else {
          throw new Error('Please tag a valid channel, e.g., #channel.');
        }
      } else if (key === 'approve') {
        dbKey = 'sticker_approve_reaction';
      } else if (key === 'reject') {
        dbKey = 'sticker_reject_reaction';
      } else if (key === 'auto_suggest') {
        dbKey = 'sticker_auto_suggest';
        value = ['true', 'yes', 'enable', '1'].includes(value.toLowerCase()) ? 'true' : 'false';
        displayValue = value === 'true' ? 'Enabled (True)' : 'Disabled (False)';
      }

      await db.setGuildSetting(guild.id, dbKey, value);

      const embed = new EmbedBuilder()
        .setColor(COLOR_SUCCESS)
        .setTitle('✅ Sticker Configuration Updated')
        .setDescription(`Successfully set config \`${key}\` to: ${displayValue}`);

      if (message.reply) {
        await message.reply({ embeds: [embed] });
      }
      return embed;
    }

    // Positional parameters supporting Slash commands
    let updated = false;
    if (commandArgs[0]) {
      const match = commandArgs[0].match(/^<#(\d+)>$/) || commandArgs[0].match(/^(\d+)$/);
      if (match) {
        await db.setGuildSetting(guild.id, 'sticker_suggest_channel', match[1]);
        updated = true;
      }
    }
    if (commandArgs[1]) {
      await db.setGuildSetting(guild.id, 'sticker_approve_reaction', commandArgs[1]);
      updated = true;
    }
    if (commandArgs[2]) {
      await db.setGuildSetting(guild.id, 'sticker_reject_reaction', commandArgs[2]);
      updated = true;
    }
    if (commandArgs[3]) {
      const val = ['true', 'yes', 'enable', '1'].includes(commandArgs[3].toLowerCase()) ? 'true' : 'false';
      await db.setGuildSetting(guild.id, 'sticker_auto_suggest', val);
      updated = true;
    }

    if (updated) {
      const embed = await showConfig();
      embed.setTitle('✅ Sticker Configuration Updated').setColor(COLOR_SUCCESS);
      if (message.reply) {
        await message.reply({ embeds: [embed] });
      }
      return embed;
    }

    throw new Error(`Invalid arguments. Use \`${prefix}sticker config\` to view config or \`${prefix}sticker config <key> <value>\` to edit.`);
  }
};
