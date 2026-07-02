const { Events, Collection } = require('discord.js');
const fs = require('fs');
const config = require('../config');
const db = require('../database');
const { getLanguage, t } = require('../utils/i18n');
const { addXp, XP_AMOUNTS } = require('../utils/leveling');
const { formatDuration } = require('../utils/time');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            if (message.author.bot || !message.guild) return;

            // --- EMOJI USAGE TRACKING ---
            const customEmojiRegex = /<a?:\w+:(\d+)>/g;
            let match;
            const seenEmojis = new Set();
            while ((match = customEmojiRegex.exec(message.content)) !== null) {
                const emojiId = match[1];
                if (message.guild.emojis.cache.has(emojiId) && !seenEmojis.has(emojiId)) {
                    seenEmojis.add(emojiId);
                    db.incrementEmojiUsage(message.guild.id, emojiId).catch(() => {});
                }
            }

            // --- STICKER USAGE TRACKING ---
            if (message.stickers && message.stickers.size > 0) {
                const sticker = message.stickers.first();
                if (message.guild.stickers.cache.has(sticker.id)) {
                    db.incrementEmojiUsage(message.guild.id, sticker.id).catch(() => {});
                }
            }

            const guildRow = await db.getGuild(message.guild.id);
            const { client } = message;
            const prefix = guildRow?.prefix || config.PREFIX;

            // --- EMOJI SUGGESTION CHANNEL LISTENER ---
            const suggestChannelId = await db.getGuildSetting(message.guild.id, 'emoji_suggest_channel');
            const isSuggestChannel = message.channel.id === suggestChannelId || 
                (!suggestChannelId && (message.channel.name.toLowerCase().includes('đề-xuất-emoji') || message.channel.name.toLowerCase().includes('de-xuat-emoji')));

            if (isSuggestChannel && !message.content.startsWith(prefix)) {
                const attachment = message.attachments ? message.attachments.first() : null;
                const hasUrl = /https?:\/\/\S+/i.test(message.content);
                const hasCustomEmoji = /<a?:\w+:\d+>/.test(message.content);
                
                const hasUnicodeEmoji = /\p{Extended_Pictographic}/u.test(message.content);

                if (attachment || hasUrl || hasCustomEmoji || hasUnicodeEmoji) {
                    let sourceUrl = '';
                    let targetName = '';

                    if (attachment) {
                        sourceUrl = attachment.url;
                        targetName = attachment.name.replace(/\.[^/.]+$/, '').replace(/[^\w]/g, '_').toLowerCase();
                    } else if (hasCustomEmoji) {
                        const match = message.content.match(/<(a)?:(\w+):(\d+)>/);
                        if (match) {
                            const animated = !!match[1];
                            const id = match[3];
                            sourceUrl = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
                            targetName = match[2];
                        }
                    } else if (hasUnicodeEmoji) {
                        const chars = [...message.content];
                        for (const char of chars) {
                            if (/\p{Extended_Pictographic}/u.test(char)) {
                                const cp = char.codePointAt(0);
                                const hex = cp.toString(16);
                                sourceUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${hex}.png`;
                                targetName = `emoji_${hex}`;
                                break;
                            }
                        }
                    } else if (hasUrl) {
                        const match = message.content.match(/(https?:\/\/\S+)/i);
                        if (match) {
                            sourceUrl = match[1];
                            targetName = 'custom_emoji';
                        }
                    }

                    const cleanWord = message.content.replace(/<a?:\w+:\d+>/g, '').replace(/https?:\/\/\S+/gi, '').replace(/[^\w\s]/g, '').trim().split(/\s+/)[0];
                    if (cleanWord && cleanWord.length >= 2 && cleanWord.length <= 32) {
                        targetName = cleanWord.replace(/[^\w]/g, '_').toLowerCase();
                    }

                    if (!targetName || !/^\w{2,32}$/.test(targetName)) {
                        targetName = `emoji_${Date.now().toString().slice(-6)}`;
                    }

                    if (sourceUrl) {
                        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                        
                        const embed = new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle('💡 Chọn Loại Đề Xuất')
                            .setDescription(`Chào ${message.author}, bạn muốn đề xuất hình ảnh này dưới dạng **Emoji** hay **Sticker**?\n\n*Lưu ý: Sticker yêu cầu kích thước 512x512 và dung lượng dưới 512KB.*`)
                            .setImage(sourceUrl);

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`suggest_type_emoji|${message.author.id}|${targetName}`)
                                .setLabel('Đề xuất Emoji 💡')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`suggest_type_sticker|${message.author.id}|${targetName}`)
                                .setLabel('Đề xuất Sticker 🏷️')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`suggest_type_cancel|${message.author.id}`)
                                .setLabel('Hủy ❌')
                                .setStyle(ButtonStyle.Danger)
                        );

                        await message.delete().catch(() => {});

                        const promptMsg = await message.channel.send({ embeds: [embed], components: [row] });
                        
                        // Automatically delete prompt after 60 seconds if no action is taken
                        setTimeout(() => {
                            promptMsg.delete().catch(() => {});
                        }, 60000);
                        return;
                    }
                }
            }

            const isCommand = message.content.startsWith(prefix);
            let shouldSkipChatXp = false;

            // --- REPUTATION SYSTEM (Memory) ---
            const lowerContent = message.content.toLowerCase();
            const toxicWords = ['ngu', 'cút', 'đm', 'vãi', 'óc', 'tồi'];
            const helpfulWords = ['cảm ơn', 'thanks', 'giúp', 'hữu ích', 'tuyệt'];

            const userStats = await db.getUser(message.author.id, message.guild.id);
            
            if (toxicWords.some(word => lowerContent.includes(word))) {
                await db.updateUser(message.author.id, { toxic_score: (userStats.toxic_score || 0) + 1 });
            } else if (helpfulWords.some(word => lowerContent.includes(word))) {
                await db.updateUser(message.author.id, { helpful_score: (userStats.helpful_score || 0) + 1 });
            }


            let tempCommand = null;
            if (isCommand) {
                const tempArgs = message.content.slice(prefix.length).trim().split(/ +/);
                const tempCommandName = (tempArgs.shift() || '').toLowerCase();
                tempCommand = client.commands.get(tempCommandName) ||
                    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(tempCommandName));

                const isBotOwner = await db.isOwner(message.author.id);
                const isAdminCmd = tempCommand && (tempCommand.ownerOnly || tempCommand.adminOnly || tempCommand.skipXp);

                // Skip Chat XP if it's an owner trying to run a command (even with typos) or if it's an admin/owner/skipped command
                if (isBotOwner || isAdminCmd) {
                    shouldSkipChatXp = true;
                }
            }

            // ─── Channel Blacklist Check ───
            const guildBlacklistRaw = await db.getGuildSetting(message.guild.id, 'blacklisted_channels', '[]');
            let guildBlacklist = [];
            try { guildBlacklist = JSON.parse(guildBlacklistRaw); } catch (e) { guildBlacklist = []; }

            const isBlacklisted = config.BLACKLISTED_CHANNELS.includes(message.channel.id) || guildBlacklist.includes(message.channel.id);
            if (isBlacklisted) {
                const isBotOwner = await db.isOwner(message.author.id);
                const canBypass = isBotOwner || (isCommand && tempCommand && tempCommand.bypassBlacklist);
                if (!canBypass) return;
            }

            if (!shouldSkipChatXp) {
                const { MESSAGE } = XP_AMOUNTS;
                const xpAmount = Math.floor(Math.random() * (MESSAGE.max - MESSAGE.min + 1)) + MESSAGE.min;

                const result = await addXp(message.member, xpAmount);
                if (result.leveledUp) {
                    const { sendLevelUpMessage } = require('../utils/leveling');
                    const lang = await getLanguage(message.author.id, message.guild?.id);
                    sendLevelUpMessage(message, result, lang).catch(() => { });
                }
            }

            // ─── Command Handling ───
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = (args.shift() || '').toLowerCase();
            if (!commandName) return;

            const lang = await getLanguage(message.author.id, message.guild?.id);

            // Check if bot is "shut down" (persisted in DB)
            const isStopped = await db.getGlobalSetting('bot_is_stopped') === 'true';
            if (isStopped && commandName !== 'startup' && commandName !== 'boot') {
                if (!await db.isOwner(message.author.id)) {
                    return message.reply(t('common.bot_shut_down', lang)).catch(() => { });
                }
            }

            // Global Ban Check
            const user = await db.getUser(message.author.id, message.guild.id);
            if (user.banned && !await db.isOwner(message.author.id)) {
                return; // Silently ignore banned users or reply with a message
            }

            const nowSeconds = Math.floor(Date.now() / 1000);
            const prisonUntil = Number(user.prison_until || 0);

            // Natural Prison Release Cleanup
            if (prisonUntil > 0 && nowSeconds >= prisonUntil) {
                await db.execute(
                    `UPDATE users SET 
                prison_until = 0, 
                bounty = 0, 
                wanted_level = 0, 
                wanted_expires_at = 0, 
                bounty_placers = '[]'
                WHERE id = ?`,
                    [message.author.id]
                );
            }

            const command = client.commands.get(commandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            // ─── Role Requirement Check ───
            const startRole = await db.getGuildSetting(message.guild.id, 'start_role', null);
            if (startRole && !message.member.roles.cache.has(startRole)) {
                const isExempt = command && ['start', 'setstartrole', 'help', 'talk', 'tts', 'noi', 'v', 'voice', 'setvoice', 'giongnoi', 'leave'].includes(command.name);
                if (!isExempt && !await db.isOwner(message.author.id)) {
                    return message.reply(t('role.missing_role_error', lang, { prefix })).catch(() => { });
                }
            }

            const { checkPrisonGuard } = require('../utils/guards');
            const prisonGuard = await checkPrisonGuard(message.author.id, message.guild.id, lang, command ? command.name : commandName);
            if (prisonGuard.inPrison) {
                return message.reply(prisonGuard.msg);
            }

            if (!command) return;

            // ─── Anti-Spam (Command Flooding) ───
            const isBotOwner = await db.isOwner(message.author.id);
            const isServerOwner = message.author.id === message.guild.ownerId;

            if (!isBotOwner && !isServerOwner) {
                if (!client.spamTrack.has(message.author.id)) {
                    client.spamTrack.set(message.author.id, []);
                }

                const timestamps = client.spamTrack.get(message.author.id);
                const nowTime = Date.now();
                const { LIMIT, WINDOW, PUNISHMENTS } = config.ANTI_SPAM;
                const windowMs = WINDOW * 1000;

                // Remove expired timestamps
                const validTimestamps = timestamps.filter(ts => nowTime - ts < windowMs);
                validTimestamps.push(nowTime);
                client.spamTrack.set(message.author.id, validTimestamps);

                if (validTimestamps.length > LIMIT) {
                    try {
                        const user = await db.getUser(message.author.id, message.guild.id);
                        const violations = (user.spam_violations || 0) + 1;

                        // Determine duration (cap at last punishment)
                        const durationIdx = Math.min(violations - 1, PUNISHMENTS.length - 1);
                        const durationSeconds = PUNISHMENTS[durationIdx];

                        // Apply timeout
                        await message.member.timeout(durationSeconds * 1000, `Anti-spam: Command flooding (Violation #${violations})`);

                        // Increment violations in DB
                        await db.updateUser(message.author.id, { spam_violations: violations });

                        client.spamTrack.set(message.author.id, []); // Reset local track after timeout

                        return message.reply(t('common.anti_spam_timeout', lang, {
                            duration: formatDuration(durationSeconds, lang),
                            count: violations
                        })).catch(() => { });
                    } catch (err) {
                        console.error('[Anti-Spam] Failed to process progressive punishment:', err);
                    }
                }
            }

            if (command.ownerOnly && !isBotOwner) {
                return message.reply(t('common.no_permission', lang));
            }

            const isAdmin = message.member.permissions.has('Administrator');

            if (command.adminOnly && !isServerOwner && !isBotOwner && !isAdmin) {
                return message.reply(t('common.no_permission', lang));
            }

            // Cooldown handling
            // const nowMillis = Date.now(); // We already have 'now' in seconds above, let's use Date.now() for consistency with cooldowns
            const nowMillis = Date.now();
            if (!client.cooldowns.has(command.name)) {
                client.cooldowns.set(command.name, new Collection());
            }

            const now = Date.now();
            const timestamps = client.cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || config.ECONOMY.DEFAULT_COOLDOWN) * 1000;

            if (timestamps.has(message.author.id)) {
                const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

                if (nowMillis < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return message.reply(t('common.cooldown', lang, {
                        command: command.name,
                        time: formatDuration(Math.ceil(timeLeft), lang)
                    }));
                }
            }

            if (!command.manualCooldown) {
                timestamps.set(message.author.id, now);
                setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
            }

            // Persistent Cooldowns
            const { checkPersistentCooldown } = require('../utils/guards');
            const persistentCooldown = await checkPersistentCooldown(message.author.id, message.guild.id, lang, command.name);
            if (persistentCooldown.onCooldown) {
                return message.reply(persistentCooldown.msg);
            }

            try {
                await command.execute(message, args);
                // Grant Command Success XP (Skip for admin/owner/utility commands to prevent imbalance)
                if (!command.ownerOnly && !command.adminOnly && !command.skipXp) {
                    const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.COMMAND_SUCCESS.max - XP_AMOUNTS.COMMAND_SUCCESS.min + 1)) + XP_AMOUNTS.COMMAND_SUCCESS.min;
                    const result = await addXp(message.member, xpAmount);
                    if (result.leveledUp) {
                        const { sendLevelUpMessage } = require('../utils/leveling');
                        sendLevelUpMessage(message, result, lang).catch(() => { });
                    }
                }
            } catch (error) {
                console.error(`[Command] Error executing !${commandName}:`, error);
                message.reply(t('common.error', lang)).catch(() => { });

                // Grant Command Failure XP (Skip for admin/owner/utility commands)
                if (!command.ownerOnly && !command.adminOnly && !command.skipXp) {
                    const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.COMMAND_FAILURE.max - XP_AMOUNTS.COMMAND_FAILURE.min + 1)) + XP_AMOUNTS.COMMAND_FAILURE.min;
                    const result = await addXp(message.member, xpAmount);
                    if (result.leveledUp) {
                        const { sendLevelUpMessage } = require('../utils/leveling');
                        sendLevelUpMessage(message, result, lang).catch(() => { });
                    }
                }
            }
        } catch (error) {
            console.error(`[Command] Fatal error in messageCreate:`, error);
            fs.appendFileSync('wc_debug.log', `[MainBot] Fatal Error: ${error.message}\n`);
        }
    },
};
