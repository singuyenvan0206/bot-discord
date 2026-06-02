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

// 1. ADD EMOJI
async function handleAdd(guild, name, url) {
  if (!name || !/^\w{2,32}$/.test(name)) {
    throw new Error('Emoji name must be alphanumeric (underscores allowed) and between 2 and 32 characters.');
  }

  const { buffer } = await downloadImage(url);
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
      }
    )
    .setFooter({ text: 'Note: Users need the "Manage Expressions" (or Manage Emojis and Stickers) permission to manage emojis.' });
}

module.exports = {
  name: 'emoji',
  aliases: ['addemoji', 'delemoji', 'deleteemoji', 'renameemoji', 'listemoji', 'emojis', 'infoemoji', 'stealemoji', 'restrictemoji'],
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
    } else if (invokedCommand === 'restrictemoji') {
      args = ['restrict', ...args];
    }

    const subcommand = args[0]?.toLowerCase();
    const guild = message.guild;

    // Permission Check: Requires MANAGE_EMOJIS_AND_STICKERS / MANAGE_EXPRESSIONS
    if (!message.member.permissions.has(PermissionFlagsBits.ManageExpressions)) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLOR_ERROR)
        .setTitle('❌ Permission Denied')
        .setDescription('You need the `Manage Expressions` (or `Manage Emojis and Stickers`) permission to use this command.');
      return message.reply({ embeds: [errEmbed] });
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
        let url = args[2];
        const attachment = message.attachments ? message.attachments.first() : null;

        if (!url && attachment) {
          url = attachment.url;
        }

        if (!name) {
          throw new Error(`Usage: \`${prefix}emoji add <name> [url]\` (or upload an attachment and type \`${prefix}emoji add <name>\`)`);
        }
        if (!url) {
          throw new Error('You must provide an image URL or upload an attachment.');
        }

        embed = await handleAdd(guild, name, url);
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
