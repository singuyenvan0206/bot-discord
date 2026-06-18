const { Events, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { EMOJI, createGiveawayEmbed, createEntryButton } = require('../utils/embeds');
const { getLanguage } = require('../utils/i18n');
const { downloadAndResizeStickerImage } = require('../utils/emojiHelpers');
const axios = require('axios');

// Helper: Convert Unicode emoji, custom emoji, or URL to a valid image URL
function parseEmojiInputToUrl(query) {
  if (!query) return null;
  if (/^https?:\/\//i.test(query)) return query;
  const customEmojiMatch = query.match(/<(a)?:(\w+):(\d+)>/);
  if (customEmojiMatch) {
    const animated = !!customEmojiMatch[1];
    const id = customEmojiMatch[3];
    return `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
  }
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

async function createEmojiFromUrl(guild, name, url) {
  let targetUrl = parseEmojiInputToUrl(url) || url;
  if (targetUrl.includes('//localhost')) {
    targetUrl = targetUrl.replace('//localhost', '//127.0.0.1');
  }
  const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');
  if (buffer.length > 256 * 1024) {
    throw new Error('Kích thước ảnh vượt quá giới hạn 256 KB của Discord.');
  }
  const emoji = await guild.emojis.create({ attachment: buffer, name });

  try {
    const { computePerceptualHash } = require('../utils/emojiHelpers');
    const hash = await computePerceptualHash(buffer);
    await db.updateEmojiHash(guild.id, emoji.id, hash);
  } catch (err) {
    console.error('Failed to save hash for approved emoji:', err);
  }

  return emoji;
}


module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (user.bot) return;

        if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
        if (reaction.message.partial) { try { await reaction.message.fetch(); } catch { return; } }

        const guild = reaction.message.guild;
        if (!guild) return;

        // --- EMOJI USAGE TRACKING ---
        if (reaction.emoji.id) {
            if (guild.emojis.cache.has(reaction.emoji.id)) {
                db.incrementEmojiUsage(guild.id, reaction.emoji.id).catch(() => {});
            }
        }

        // --- EMOJI & STICKER SUGGESTION REACTION HANDLER ---
        const emojiSuggestChannelId = await db.getGuildSetting(guild.id, 'emoji_suggest_channel');
        const stickerSuggestChannelId = await db.getGuildSetting(guild.id, 'sticker_suggest_channel');
        const isSuggestChannel = reaction.message.channelId === emojiSuggestChannelId || 
            reaction.message.channelId === stickerSuggestChannelId ||
            (!emojiSuggestChannelId && !stickerSuggestChannelId && (
                reaction.message.channel.name.toLowerCase().includes('đề-xuất-emoji') || 
                reaction.message.channel.name.toLowerCase().includes('de-xuat-emoji') ||
                reaction.message.channel.name.toLowerCase().includes('đề-xuất-sticker') || 
                reaction.message.channel.name.toLowerCase().includes('de-xuat-sticker')
            ));

        if (isSuggestChannel) {
            const member = await guild.members.fetch(user.id).catch(() => null);
            const isBotOwner = await db.isOwner(user.id);
            const hasManagePerms = member && (
                member.permissions.has(PermissionFlagsBits.ManageGuildExpressions) || 
                member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers) || 
                isBotOwner
            );

            if (hasManagePerms) {
                // Read custom reaction configuration based on whether it is a sticker or emoji
                const embed = reaction.message.embeds[0];
                const footerText = embed?.footer?.text || '';
                const isSticker = footerText.includes('Type: sticker');

                const approveEmoji = isSticker 
                    ? await db.getGuildSetting(guild.id, 'sticker_approve_reaction', '✅')
                    : await db.getGuildSetting(guild.id, 'emoji_approve_reaction', '✅');
                const rejectEmoji = isSticker 
                    ? await db.getGuildSetting(guild.id, 'sticker_reject_reaction', '❌')
                    : await db.getGuildSetting(guild.id, 'emoji_reject_reaction', '❌');

                const isApprove = reaction.emoji.name === approveEmoji;
                const isReject = reaction.emoji.name === rejectEmoji;

                if (isApprove || isReject) {
                    if (embed && footerText) {
                        const sourceMatch = footerText.match(/Source:\s*(https?:\/\/\S+)\s*\|\s*Name:\s*([\w-]+)/);
                        if (sourceMatch) {
                            const sourceUrl = sourceMatch[1];
                            const targetName = sourceMatch[2];

                            // Remove reactions to lock the suggestion card
                            await reaction.message.reactions.removeAll().catch(() => {});

                            if (isSticker) {
                                const tagsMatch = footerText.match(/Tags:\s*([^\s|]+)/);
                                const stickerTags = tagsMatch ? tagsMatch[1] : '✨';

                                if (isApprove) {
                                    try {
                                        const buffer = await downloadAndResizeStickerImage(sourceUrl);
                                        const newSticker = await guild.stickers.create({
                                            file: buffer,
                                            name: targetName,
                                            tags: stickerTags,
                                            description: 'Approved via suggestion'
                                        });

                                        const updatedEmbed = EmbedBuilder.from(embed)
                                            .setColor(0x57F287) // Success green
                                            .setTitle('✅ Đề Xuất Sticker Được Duyệt')
                                            .setDescription(`Sticker **${targetName}** đã được thêm vào server thành công bởi ${user}!\nTags: ${stickerTags}`);
                                        
                                        await reaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
                                    } catch (err) {
                                        const errorEmbed = EmbedBuilder.from(embed)
                                            .setColor(0xED4245) // Error red
                                            .setTitle('❌ Lỗi Duyệt Sticker')
                                            .setDescription(`Thất bại khi tự động thêm sticker **${targetName}**.\nChi tiết: ${err.message}`);
                                        await reaction.message.edit({ embeds: [errorEmbed] }).catch(() => {});
                                    }
                                } else if (isReject) {
                                    const updatedEmbed = EmbedBuilder.from(embed)
                                        .setColor(0xED4245) // Error red
                                        .setTitle('❌ Đề Xuất Sticker Bị Từ Chối')
                                        .setDescription(`Đề xuất cho sticker **${targetName}** đã bị từ chối bởi quản trị viên ${user}.`);
                                    
                                    await reaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
                                }
                            } else {
                                if (isApprove) {
                                    try {
                                        const newEmoji = await createEmojiFromUrl(guild, targetName, sourceUrl);
                                        const updatedEmbed = EmbedBuilder.from(embed)
                                            .setColor(0x57F287) // Success green
                                            .setTitle('✅ Đề Xuất Emoji Được Duyệt')
                                            .setDescription(`Emoji **${targetName}** đã được thêm vào server thành công bởi ${user}!\nBiểu tượng: ${newEmoji}`);
                                        
                                        await reaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
                                    } catch (err) {
                                        const errorEmbed = EmbedBuilder.from(embed)
                                            .setColor(0xED4245) // Error red
                                            .setTitle('❌ Lỗi Duyệt Emoji')
                                            .setDescription(`Thất bại khi tự động thêm emoji **${targetName}**.\nChi tiết: ${err.message}`);
                                        await reaction.message.edit({ embeds: [errorEmbed] }).catch(() => {});
                                    }
                                } else if (isReject) {
                                    const updatedEmbed = EmbedBuilder.from(embed)
                                        .setColor(0xED4245) // Error red
                                        .setTitle('❌ Đề Xuất Emoji Bị Từ Chối')
                                        .setDescription(`Đề xuất cho emoji **${targetName}** đã bị từ chối bởi quản trị viên ${user}.`);
                                    
                                    await reaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
                                }
                            }
                            return; // Handled
                        }
                    }
                }
            }
        }

        // --- GIVEAWAY REACTION HANDLER ---
        if (reaction.emoji.name !== EMOJI) return;

        const giveaway = await db.getGiveaway(reaction.message.id);
        if (!giveaway || giveaway.ended) return;

        if (giveaway.paused) {
            await reaction.users.remove(user.id).catch(() => { });
            return;
        }

        if (giveaway.required_role_id) {
            try {
                const member = await guild.members.fetch(user.id);
                if (!member.roles.cache.has(giveaway.required_role_id)) {
                    await reaction.users.remove(user.id).catch(() => { });
                    return;
                }
            } catch { return; }
        }

        await db.addParticipant(giveaway.id, user.id);
        await updateGiveawayEmbed(reaction.message, giveaway);
    },
};

async function updateGiveawayEmbed(message, giveaway) {
    try {
        const lang = await getLanguage(null, giveaway.guild_id);
        const count = await db.getParticipantCount(giveaway.id);
        const embed = createGiveawayEmbed(giveaway, count, lang);
        await message.edit({ embeds: [embed], components: [createEntryButton(false, lang)] });
    } catch (err) {
        console.error('[Giveaway] Failed to update embed:', err);
    }
}
