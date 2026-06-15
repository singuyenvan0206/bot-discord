const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLOR_SUCCESS, COLOR_INFO } = require('../../../utils/emojiHelpers');
const db = require('../../../database');
const config = require('../../../config');

module.exports = {
  name: 'configemoji',
  aliases: ['configemoji'],
  description: 'Cài đặt đề xuất và dọn dẹp emoji (Configure emoji suggestion settings)',
  async execute(message, args) {
    const isBotOwner = await db.isOwner(message.author.id);
    if (!isBotOwner && !message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      throw new Error('You need the Manage Expressions permission to use this command.');
    }

    let commandArgs = args;
    if (args[0]?.toLowerCase() === 'config') {
      commandArgs = args.slice(1);
    }

    const guild = message.guild;
    const prefix = config.PREFIX;

    // Helper: Show current configuration
    const showConfig = async () => {
      const suggestChannelId = await db.getGuildSetting(guild.id, 'emoji_suggest_channel', null);
      const approveEmoji = await db.getGuildSetting(guild.id, 'emoji_approve_reaction', '✅');
      const rejectEmoji = await db.getGuildSetting(guild.id, 'emoji_reject_reaction', '❌');
      const autoSuggest = await db.getGuildSetting(guild.id, 'emoji_auto_suggest', 'false');
      const autoPrune = await db.getGuildSetting(guild.id, 'emoji_auto_prune', 'false');
      const minUses = await db.getGuildSetting(guild.id, 'emoji_prune_min_uses', '5');
      const inactiveDays = await db.getGuildSetting(guild.id, 'emoji_prune_inactive_days', '30');

      const channelDisplay = suggestChannelId ? `<#${suggestChannelId}>` : '_Not configured_';

      return new EmbedBuilder()
        .setColor(COLOR_INFO)
        .setTitle('⚙️ Emoji Configuration')
        .setDescription(`Manage emoji settings for **${guild.name}**. Use \`${prefix}emoji config <key> <value>\` to edit.`)
        .addFields(
          { name: 'Channel (`channel`)', value: channelDisplay, inline: true },
          { name: 'Approve Reaction (`approve`)', value: approveEmoji, inline: true },
          { name: 'Reject Reaction (`reject`)', value: rejectEmoji, inline: true },
          { name: 'Auto Suggest (`auto_suggest`)', value: autoSuggest === 'true' ? 'Enabled (True)' : 'Disabled (False)', inline: true },
          { name: 'Auto Prune (`auto_prune`)', value: autoPrune === 'true' ? 'Enabled (True)' : 'Disabled (False)', inline: true },
          { name: 'Prune Min Uses (`prune_min_uses`)', value: minUses.toString(), inline: true },
          { name: 'Prune Inactive Days (`prune_inactive_days`)', value: inactiveDays.toString(), inline: true }
        );
    };

    // 1. If no args provided, show config
    if (commandArgs.length === 0) {
      const embed = await showConfig();
      if (message.reply) {
        await message.reply({ embeds: [embed] });
      }
      return embed;
    }

    // 2. Single Key/Value Configuration (Prefix mode)
    const validKeys = ['channel', 'approve', 'reject', 'auto_suggest', 'auto_prune', 'prune_min_uses', 'prune_inactive_days'];
    const key = commandArgs[0]?.toLowerCase();

    if (commandArgs.length === 2 && validKeys.includes(key)) {
      let value = commandArgs[1];
      let dbKey = '';
      let displayValue = value;

      if (key === 'channel') {
        dbKey = 'emoji_suggest_channel';
        const match = value.match(/^<#(\d+)>$/) || value.match(/^(\d+)$/);
        if (match) {
          const channelId = match[1];
          const channel = guild.channels.cache.get(channelId);
          if (!channel) throw new Error('Could not find that channel in this server.');
          value = channelId;
          displayValue = `<#${channelId}>`;
        } else if (value.toLowerCase() === 'none' || value.toLowerCase() === 'null') {
          value = '';
          displayValue = 'Cleared';
        } else {
          throw new Error('Please tag a valid channel, e.g., #channel.');
        }
      } else if (key === 'approve') {
        dbKey = 'emoji_approve_reaction';
      } else if (key === 'reject') {
        dbKey = 'emoji_reject_reaction';
      } else if (key === 'auto_suggest') {
        dbKey = 'emoji_auto_suggest';
        value = ['true', 'yes', 'enable', '1'].includes(value.toLowerCase()) ? 'true' : 'false';
        displayValue = value === 'true' ? 'Enabled (True)' : 'Disabled (False)';
      } else if (key === 'auto_prune') {
        dbKey = 'emoji_auto_prune';
        value = ['true', 'yes', 'enable', '1'].includes(value.toLowerCase()) ? 'true' : 'false';
        displayValue = value === 'true' ? 'Enabled (True)' : 'Disabled (False)';
      } else if (key === 'prune_min_uses') {
        dbKey = 'emoji_prune_min_uses';
        const num = parseInt(value);
        if (isNaN(num) || num < 0) throw new Error('Min uses must be a non-negative integer.');
        value = num.toString();
      } else if (key === 'prune_inactive_days') {
        dbKey = 'emoji_prune_inactive_days';
        const num = parseInt(value);
        if (isNaN(num) || num < 0) throw new Error('Inactive days must be a non-negative integer.');
        value = num.toString();
      }

      await db.setGuildSetting(guild.id, dbKey, value);

      const embed = new EmbedBuilder()
        .setColor(COLOR_SUCCESS)
        .setTitle('✅ Configuration Updated')
        .setDescription(`Successfully set config \`${key}\` to: ${displayValue}`);

      if (message.reply) {
        await message.reply({ embeds: [embed] });
      }
      return embed;
    }

    // 3. Positional Configuration (Slash command mode)
    // args: [channel, approve, reject, autoSuggest, autoPrune, pruneMinUses, pruneInactiveDays]
    let updated = false;

    // Channel
    if (commandArgs[0]) {
      const channelVal = commandArgs[0];
      const match = channelVal.match(/^<#(\d+)>$/) || channelVal.match(/^(\d+)$/);
      if (match) {
        await db.setGuildSetting(guild.id, 'emoji_suggest_channel', match[1]);
        updated = true;
      }
    }
    // Approve
    if (commandArgs[1]) {
      await db.setGuildSetting(guild.id, 'emoji_approve_reaction', commandArgs[1]);
      updated = true;
    }
    // Reject
    if (commandArgs[2]) {
      await db.setGuildSetting(guild.id, 'emoji_reject_reaction', commandArgs[2]);
      updated = true;
    }
    // Auto Suggest
    if (commandArgs[3]) {
      const val = ['true', 'yes', 'enable', '1'].includes(commandArgs[3].toLowerCase()) ? 'true' : 'false';
      await db.setGuildSetting(guild.id, 'emoji_auto_suggest', val);
      updated = true;
    }
    // Auto Prune
    if (commandArgs[4]) {
      const val = ['true', 'yes', 'enable', '1'].includes(commandArgs[4].toLowerCase()) ? 'true' : 'false';
      await db.setGuildSetting(guild.id, 'emoji_auto_prune', val);
      updated = true;
    }
    // Prune Min Uses
    if (commandArgs[5]) {
      const num = parseInt(commandArgs[5]);
      if (!isNaN(num) && num >= 0) {
        await db.setGuildSetting(guild.id, 'emoji_prune_min_uses', num.toString());
        updated = true;
      }
    }
    // Prune Inactive Days
    if (commandArgs[6]) {
      const num = parseInt(commandArgs[6]);
      if (!isNaN(num) && num >= 0) {
        await db.setGuildSetting(guild.id, 'emoji_prune_inactive_days', num.toString());
        updated = true;
      }
    }

    if (updated) {
      const embed = await showConfig();
      embed.setTitle('✅ Configuration Updated').setColor(COLOR_SUCCESS);
      if (message.reply) {
        await message.reply({ embeds: [embed] });
      }
      return embed;
    }

    throw new Error(`Invalid arguments. Use \`${prefix}emoji config\` to view config or \`${prefix}emoji config <key> <value>\` to edit.`);
  }
};
