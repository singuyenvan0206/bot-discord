const { Events, Collection, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const { getLanguage, t } = require('../utils/i18n');
const config = require('../config');
const { formatDuration } = require('../utils/time');
const { BUTTON_ID, createGiveawayEmbed, createEntryButton } = require('../utils/embeds');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const { client } = interaction;
        const lang = await getLanguage(interaction.user.id, interaction.guildId);

        // ─── Channel Blacklist Check ───
        if (interaction.guildId) {
            const guildBlacklistRaw = await db.getGuildSetting(interaction.guildId, 'blacklisted_channels', '[]');
            let guildBlacklist = [];
            try { guildBlacklist = JSON.parse(guildBlacklistRaw); } catch (e) { guildBlacklist = []; }

            if (config.BLACKLISTED_CHANNELS.includes(interaction.channelId) || guildBlacklist.includes(interaction.channelId)) {
                if (!await db.isOwner(interaction.user.id)) return;
            }
        }

        const user = await db.getUser(interaction.user.id, interaction.guildId);
        const nowSeconds = Math.floor(Date.now() / 1000);
        let prisonUntil = Number(user.prison_until || 0);

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
                [interaction.user.id]
            );
            prisonUntil = 0; // Update local variable to allow interaction
        }

        const isInPrison = nowSeconds < prisonUntil;

        const { checkPrisonGuard, checkPersistentCooldown } = require('../utils/guards');

        // ─── Global Role Requirement Check ───
        const startRole = await db.getGuildSetting(interaction.guildId, 'start_role', null);
        if (startRole && !interaction.member.roles.cache.has(startRole)) {
            const isBotOwner = await db.isOwner(interaction.user.id);
            // Allow claim_house_dist because it has its own detailed check and might be the first thing a user sees
            const isExempt = ['claim_house_dist', 'check_dist_reward'].includes(interaction.customId);
            
            if (!isExempt && !isBotOwner) {
                return interaction.reply({ 
                    content: t('role.missing_role_error', lang, { prefix: config.PREFIX }), 
                    flags: [MessageFlags.Ephemeral] 
                }).catch(() => { });
            }
        }

        // 1. Button Interactions
        if (interaction.isButton()) {
            // General Prison Check for Buttons
            const prisonGuard = await checkPrisonGuard(interaction.user.id, interaction.guildId, lang);
            if (prisonGuard.inPrison) {
                // Allow specific exceptions for buttons
                const isPagination = ['prev', 'next'].includes(interaction.customId);
                const isManualBail = interaction.customId.includes('bail') || interaction.customId.includes('check_dist_reward');

                if (!isPagination && !isManualBail) {
                    return interaction.reply({ content: prisonGuard.msg, flags: [MessageFlags.Ephemeral] }).catch(() => { });
                }
            }


            if (interaction.customId.startsWith('emoji_preview_suggest|')) {
                await interaction.deferUpdate().catch(() => {});
                
                const parts = interaction.customId.split('|');
                const emojiName = parts[1];
                const relativePath = parts[2];
                const imageUrl = `https://emojis.slackmojis.com/emojis/images/${relativePath}`;

                const guild = interaction.guild;

                try {
                    const emojiCommand = require('../commands/utility/emoji');
                    await emojiCommand.handleSuggest(guild, emojiName, imageUrl, interaction.user);
                    
                    const { EmbedBuilder } = require('discord.js');
                    const successEmbed = new EmbedBuilder()
                        .setColor(0x57F287) // COLOR_SUCCESS
                        .setTitle('💡 Đề Xuất Thành Công')
                        .setDescription(`Đã gửi đề xuất emoji **:${emojiName}:** vào kênh bình chọn thành công!`);

                    await interaction.editReply({ embeds: [successEmbed], components: [] }).catch(() => {});
                } catch (err) {
                    await interaction.followUp({ content: `❌ Thất bại khi gửi đề xuất emoji: ${err.message}`, ephemeral: true }).catch(() => {});
                }
                return;
            }

            if (interaction.customId === 'emoji_preview_cancel') {
                await interaction.deferUpdate().catch(() => {});
                const { EmbedBuilder } = require('discord.js');
                const cancelEmbed = new EmbedBuilder()
                    .setColor(0xED4245) // COLOR_ERROR
                    .setTitle('❌ Đã Hủy Bỏ')
                    .setDescription('Đã hủy bỏ thao tác xem trước emoji.');
                await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
                return;
            }

            if (interaction.customId === 'claim_house_dist') {
                const guildId = interaction.guildId;
                const activeDistRaw = await db.getGuildSetting(guildId, 'active_house_dist', null);
                if (!activeDistRaw) {
                    return interaction.reply({ content: t('economy.dist_expired', lang), flags: [MessageFlags.Ephemeral] }).catch(() => { });
                }

                let distData;
                try { distData = JSON.parse(activeDistRaw); } catch (e) { distData = null; }
                if (!distData) return;

                const now = Math.floor(Date.now() / 1000);
                if (now > distData.endsAt || distData.remaining <= 0) {
                    return interaction.reply({ content: t('economy.dist_expired', lang), flags: [MessageFlags.Ephemeral] }).catch(() => { });
                }

                // Check Role Requirement (Dynamic check against current guild setting)
                const currentStartRole = await db.getGuildSetting(guildId, 'start_role', null);
                if (currentStartRole && !interaction.member.roles.cache.has(currentStartRole)) {
                    return interaction.reply({ content: t('role.missing_role_error', lang, { prefix: config.PREFIX }), flags: [MessageFlags.Ephemeral] }).catch(() => { });
                }

                // Check Already Claimed
                if (distData.claimed.includes(interaction.user.id)) {
                    return interaction.reply({ content: t('economy.dist_already_claimed', lang), flags: [MessageFlags.Ephemeral] }).catch(() => { });
                }

                // ─── Calculate Reward ───
                // Each claim gets roughly 1/20th of the initial pool, with some randomness
                const baseReward = distData.pool / 20;
                let reward = Math.floor(baseReward * (0.5 + Math.random()));
                
                // Safety: Can't claim more than remaining, and ensure it's at least 1
                reward = Math.max(1, Math.min(distData.remaining, reward));
                
                // If it's the last bit of money, just give it all
                if (distData.remaining < baseReward) reward = distData.remaining;

                // ─── Update State ───
                distData.remaining -= reward;
                distData.claimed.push(interaction.user.id);

                await db.addBalance(guildId, interaction.user.id, reward);
                await db.setGuildSetting(guildId, 'active_house_dist', JSON.stringify(distData));

                // ─── Acknowledge and Update Message ───
                await interaction.reply({ 
                    content: t('economy.dist_claim_success', lang, { amount: reward.toLocaleString(), emoji: config.EMOJIS.COIN }), 
                    flags: [MessageFlags.Ephemeral] 
                }).catch(() => { });

                // Update the original message embed to show remaining balance
                const { EmbedBuilder } = require('discord.js');
                const oldEmbed = interaction.message.embeds[0];
                if (oldEmbed) {
                    const newEmbed = EmbedBuilder.from(oldEmbed)
                        .setFields({ 
                            name: t('economy.dist_status', lang, { 
                                remaining: distData.remaining.toLocaleString(), 
                                total: distData.pool.toLocaleString(), 
                                emoji: config.EMOJIS.COIN 
                            }), 
                            value: oldEmbed.fields[0].value 
                        });
                    
                    // If pool is empty, remove buttons and update title
                    const components = distData.remaining <= 0 ? [] : interaction.message.components;
                    if (distData.remaining <= 0) {
                        newEmbed.setTitle(t('economy.dist_ended_title', lang) || "🛑 Quỹ Phúc Lợi Đã Đóng")
                                .setColor(config.COLORS.ERROR);
                    }

                    await interaction.message.edit({ embeds: [newEmbed], components }).catch(() => { });
                }

                return;
            }

            if (interaction.customId === BUTTON_ID) {
                return handleButtonEntry(interaction);
            }
            if (interaction.customId === 'check_dist_reward') {
                const amount = user ? (user.last_dist_amount || 0) : 0;

                if (amount <= 0) {
                    return interaction.reply({
                        content: t('economy.no_reward_msg', lang) || "❌ Bạn không nhận được phần thưởng nào trong đợt này hoặc phần thưởng đã hết hạn.",
                        flags: [MessageFlags.Ephemeral]
                    }).catch(() => { });
                }

                return interaction.reply({
                    content: t('economy.ephemeral_reward_msg', lang, {
                        amount: amount.toLocaleString(),
                        emoji: config.EMOJIS.COIN
                    }) || `Bạn đã nhận được **${amount.toLocaleString()}** ${config.EMOJIS.COIN} từ đợt chia thưởng vừa rồi! 🎉`,
                    flags: [MessageFlags.Ephemeral]
                }).catch(() => { });
            }
        }

        // 2. String Select Menu Interactions
        else if (interaction.isStringSelectMenu()) {
            // General Prison Check for Select Menus
            if (isInPrison) {
                // Allow rank menu for profile browsing
                if (!interaction.customId.startsWith('rank_')) {
                    const timeLeft = formatDuration(prisonUntil - nowSeconds, lang);
                    return interaction.reply({
                        content: t('common.user_in_prison_global', lang, { time: timeLeft }),
                        flags: [MessageFlags.Ephemeral]
                    }).catch(() => { });
                }
            }
            // All rank_ interactions are handled by the inline collector in rank.js
            
            if (interaction.customId === 'emoji_search_select') {
                await interaction.deferReply({ ephemeral: true }).catch(() => {});
                
                const parts = interaction.values[0].split('|');
                if (parts.length < 2) {
                    return interaction.followUp({ content: '❌ Định dạng dữ liệu không hợp lệ.', ephemeral: true }).catch(() => {});
                }
                
                const emojiName = parts[0];
                const relativePath = parts[1];
                const imageUrl = `https://emojis.slackmojis.com/emojis/images/${relativePath}`;

                const guild = interaction.guild;
                const member = interaction.member;

                const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                const isAdmin = member.permissions.has(PermissionFlagsBits.ManageGuildExpressions);

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2) // Blurple
                    .setTitle(`🔍 Xem Trước Emoji: :${emojiName}:`)
                    .setDescription('Bạn có muốn thêm emoji này vào server không? Chọn một thao tác dưới đây.')
                    .addFields(
                        { name: 'Tên Đề Xuất', value: `\`:${emojiName}:\``, inline: true },
                        { name: 'Nguồn', value: 'Slackmojis', inline: true }
                    )
                    .setImage(imageUrl);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`emoji_preview_suggest|${emojiName}|${relativePath}`)
                        .setLabel('Đề Xuất Bình Chọn')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('emoji_preview_cancel')
                        .setLabel('Hủy')
                        .setStyle(ButtonStyle.Danger)
                );

                await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true }).catch(() => {});
                return;
            }
        }

        // 3. Slash Commands
        else if (interaction.isChatInputCommand()) {
            const commandName = interaction.commandName;

            // Check if bot is "shut down"
            const isStopped = await db.getGlobalSetting('bot_is_stopped') === 'true';
            if (isStopped && commandName !== 'startup' && commandName !== 'boot' && !await db.isOwner(interaction.user.id)) {
                return interaction.reply({ content: t('common.bot_shut_down', lang), flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }

            const command = client.commands.get(commandName);
            if (!command) return;

            // Guards
            const prisonGuard = await checkPrisonGuard(interaction.user.id, interaction.guildId, lang, commandName);
            if (prisonGuard.inPrison) {
                return interaction.reply({ content: prisonGuard.msg, flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }

            const persistentCooldown = await checkPersistentCooldown(interaction.user.id, interaction.guildId, lang, commandName);
            if (persistentCooldown.onCooldown) {
                return interaction.reply({ content: persistentCooldown.msg, flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }

            let args = [];
            if (commandName === 'giveaway') {
                const sub = interaction.options.getSubcommand();
                args.push(sub);
                if (sub === 'start') {
                    args.push(interaction.options.getString('duration'));
                    args.push(String(interaction.options.getInteger('winners')));
                    args.push(interaction.options.getString('prize'));
                } else if (['end', 'reroll', 'pause', 'resume', 'delete'].includes(sub)) {
                    args.push(interaction.options.getString('message_id'));
                }
            } else if (commandName === 'emoji') {
                const sub = interaction.options.getSubcommand();
                args.push(sub);
                if (sub === 'steal') {
                    args.push(interaction.options.getString('emoji_or_message'));
                } else if (sub === 'suggest') {
                    args.push(interaction.options.getString('name'));
                    const url = interaction.options.getString('url');
                    const file = interaction.options.getAttachment('file');
                    args.push(url || (file ? file.url : ''));
                } else if (sub === 'config') {
                    const channel = interaction.options.getChannel('channel');
                    const approve = interaction.options.getString('approve');
                    const reject = interaction.options.getString('reject');
                    const autoSuggest = interaction.options.getString('auto_suggest');
                    const autoPrune = interaction.options.getString('auto_prune');
                    const pruneMinUses = interaction.options.getInteger('prune_min_uses');
                    const pruneInactiveDays = interaction.options.getInteger('prune_inactive_days');
                    args.push(channel ? `<#${channel.id}>` : '');
                    args.push(approve || '');
                    args.push(reject || '');
                    args.push(autoSuggest || '');
                    args.push(autoPrune || '');
                    args.push(pruneMinUses !== null ? String(pruneMinUses) : '');
                    args.push(pruneInactiveDays !== null ? String(pruneInactiveDays) : '');
                } else if (sub === 'search') {
                    args.push(interaction.options.getString('query'));
                } else if (sub === 'inactive' || sub === 'prune') {
                    const minUses = interaction.options.getInteger('min_uses');
                    const inactiveDays = interaction.options.getInteger('inactive_days');
                    args.push(minUses !== null ? String(minUses) : '5');
                    args.push(inactiveDays !== null ? String(inactiveDays) : '30');
                } else if (sub === 'websearch') {
                    args.push(interaction.options.getString('query'));
                } else if (sub === 'autosuggest') {
                    // No additional arguments
                } else if (sub === 'usage') {
                    const page = interaction.options.getInteger('page');
                    args.push(page !== null ? String(page) : '1');
                }
            } else if (commandName === 'job') {
                const sub = interaction.options.getSubcommand();
                args.push(sub);
                if (sub === 'set') {
                    args.push(interaction.options.getString('id'));
                }
            } else if (commandName === 'setrole') {
                const sub = interaction.options.getSubcommand();
                args.push(sub);
                if (sub === 'add' || sub === 'remove') {
                    args.push(`<@&${interaction.options.getRole('role').id}>`);
                    if (sub === 'add') {
                        args.push(String(interaction.options.getInteger('price')));
                        args.push(String(interaction.options.getInteger('income') || 0));
                        args.push(String(interaction.options.getInteger('xp') || 0));
                    }
                } else if (sub === 'updateid') {
                    args.push(interaction.options.getString('old_id'));
                    args.push(`<@&${interaction.options.getRole('new_role').id}>`);
                }
            } else {
                const optionMap = {
                    'coinflip': ['choice', 'bet'],
                    '8ball': ['question'],
                    'transfer': ['user', 'amount'],
                    'buy': ['item', 'quantity'],
                    'blackjack': ['bet'], 'poker': ['bet'], 'dice': ['bet'],
                    'slots': ['bet'], 'minesweeper': ['bet'], 'memory': ['bet'],
                    'balance': ['user'], 'avatar': ['user'], 'userinfo': ['user'], 'profile': ['user'], 'lvl': ['user'],
                    'help': ['command'],
                    'rob': ['target'],
                    'use': ['item'],
                    'sell': ['item', 'quantity'],
                    'jobdetail': ['id'],
                    'iteminfo': ['id'],
                    'connect4': ['opponent', 'bet'],
                    'rps': ['choice', 'bet'],
                    'tictactoe': ['opponent'],
                    'inventory': ['user'],
                    'rank': ['type'],
                    'language': ['choice', 'scope'],
                    'setdistchannel': ['channel'],
                    'lottery': ['action', 'amount'],
                    'additem': ['user', 'item', 'amount'],
                    'addmoney': ['user', 'amount'],
                    'leaveserver': ['id'],
                    'removemoney': ['user', 'amount'],
                    'resetdatabase': ['confirm'],
                    'resetuser': ['user', 'confirm'],
                    'serverlist': ['page'],
                    'setexp': ['user', 'amount'],
                    'setlevel': ['user', 'level'],
                    'setowner': ['user'],
                    'setstatus': ['type', 'text'],
                    'gift': ['user', 'item', 'amount'],
                    'marriage': ['user'],
                    'marry': ['user'],
                    'level': ['user'],
                    'freelance': [],
                };

                const optionNames = optionMap[commandName] || [];
                for (const name of optionNames) {
                    const raw = interaction.options.get(name);
                    if (!raw) continue;
                    if (raw.type === 6) { // USER
                        const userOpt = interaction.options.getUser(name);
                        if (userOpt) args.push(`<@${userOpt.id}>`);
                    } else if (raw.type === 4) { // INTEGER
                        const intOpt = interaction.options.getInteger(name);
                        if (intOpt !== null) args.push(String(intOpt));
                    } else if (raw.type === 3) { // STRING
                        const strOpt = interaction.options.getString(name);
                        if (strOpt) args.push(strOpt);
                    } else if (raw.type === 7) { // CHANNEL
                        const channelOpt = interaction.options.getChannel(name);
                        if (channelOpt) args.push(`<#${channelOpt.id}>`);
                    } else if (raw.type === 8) { // ROLE
                        const roleOpt = interaction.options.getRole(name);
                        if (roleOpt) args.push(`<@&${roleOpt.id}>`);
                    }
                }
            }

            // Message Adapter
            let hasReplied = false;
            const messageAdapter = {
                author: interaction.user,
                member: interaction.member,
                channel: interaction.channel,
                guild: interaction.guild,
                client: interaction.client,
                createdTimestamp: interaction.createdTimestamp,
                content: `$${commandName} ${args.join(' ')}`.trim(),
                mentions: {
                    users: {
                        first: () => interaction.options.getUser('user') || interaction.options.getUser('target') || interaction.options.getUser('opponent') || interaction.options.getUser('member') || null
                    },
                    roles: {
                        first: () => interaction.options.getRole('role') || null
                    },
                    channels: {
                        first: () => interaction.options.getChannel('channel') || null
                    },
                    members: {
                        first: () => interaction.options.getMember('user') || interaction.options.getMember('target') || interaction.options.getMember('opponent') || interaction.options.getMember('member') || null
                    }
                },
                reply: async (content) => {
                    try {
                        if (typeof content === 'string') content = { content, withResponse: true };
                        else content = { ...content, withResponse: true };

                        if (!hasReplied) {
                            hasReplied = true;
                            return await interaction.reply(content);
                        } else {
                            return await interaction.followUp(content);
                        }
                    } catch (err) {
                        if (typeof content === 'object') delete content.withResponse;
                        return await interaction.channel.send(content).catch(() => { });
                    }
                },
                edit: async (content) => {
                    try { return await interaction.editReply(content); } catch { return null; }
                },
                react: async () => { },
                delete: async () => { },
            };
            // Permission handling
            if (command.ownerOnly && !await db.isOwner(interaction.user.id)) {
                return interaction.reply({ content: t('common.no_permission', lang), flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }

            const isServerOwner = interaction.user.id === interaction.guild.ownerId;
            const isBotOwner = await db.isOwner(interaction.user.id);
            const isAdmin = interaction.member.permissions.has('Administrator');

            if (command.adminOnly && !isServerOwner && !isBotOwner && !isAdmin) {
                return interaction.reply({ content: t('common.no_permission', lang), flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }

            // Cooldowns
            if (!client.cooldowns.has(command.name)) {
                client.cooldowns.set(command.name, new Collection());
            }

            const now = Date.now();
            const timestamps = client.cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || config.ECONOMY.DEFAULT_COOLDOWN) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply({
                        content: t('common.cooldown', lang, { time: formatDuration(Math.ceil(timeLeft), lang) }),
                        flags: [MessageFlags.Ephemeral]
                    }).catch(() => { });
                }
            }

            if (!command.manualCooldown) {
                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            }

            // Defer reply for commands that might take time (utility/data heavy)
            if (commandName === 'rank' || commandName === 'leaderboard' || command.defer) {
                await interaction.deferReply().catch(() => { });
            }

            try {
                await command.execute(messageAdapter, args);

                // Grant Command Success XP (Skip for admin/owner/utility commands to prevent imbalance)
                if (!command.ownerOnly && !command.adminOnly && !command.skipXp) {
                    const { addXp, XP_AMOUNTS, sendLevelUpMessage } = require('../utils/leveling');
                    const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.COMMAND_SUCCESS.max - XP_AMOUNTS.COMMAND_SUCCESS.min + 1)) + XP_AMOUNTS.COMMAND_SUCCESS.min;
                    const result = await addXp(interaction.member, xpAmount);
                    if (result.leveledUp) {
                        sendLevelUpMessage(messageAdapter, result, lang).catch(() => { });
                    }
                }
            } catch (error) {
                console.error(`[Slash] Error executing /${commandName}:`, error);
                const errMsg = t('common.error', lang);
                if (!hasReplied) interaction.reply({ content: errMsg, flags: [64] }).catch(() => { });
                else interaction.followUp({ content: errMsg, flags: [64] }).catch(() => { });

                // Grant Command Failure XP (Skip for admin/owner/utility commands)
                if (!command.ownerOnly && !command.adminOnly && !command.skipXp) {
                    const { addXp, XP_AMOUNTS, sendLevelUpMessage } = require('../utils/leveling');
                    const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.COMMAND_FAILURE.max - XP_AMOUNTS.COMMAND_FAILURE.min + 1)) + XP_AMOUNTS.COMMAND_FAILURE.min;
                    const result = await addXp(interaction.member, xpAmount);
                    if (result.leveledUp) {
                        sendLevelUpMessage(messageAdapter, result, lang).catch(() => { });
                    }
                }
            }
        }
    },
};

async function handleButtonEntry(interaction) {
    const guildId = interaction.guildId;
    const lang = await getLanguage(interaction.user.id, guildId);
    const giveaway = await db.getGiveaway(interaction.message.id);

    // Acknowledge immediately to prevent PC sticky state
    await interaction.deferUpdate().catch(() => { });

    if (!giveaway) return interaction.followUp({ content: t('giveaway.not_exists', lang), flags: [64] });
    if (giveaway.ended) return interaction.followUp({ content: t('giveaway.already_ended_error', lang), flags: [64] });
    if (giveaway.paused) return interaction.followUp({ content: t('giveaway.paused_title', lang), flags: [64] });

    if (giveaway.required_role_id && !interaction.member.roles.cache.has(giveaway.required_role_id)) {
        return interaction.followUp({ content: t('giveaway.role_required_msg', lang, { roleId: giveaway.required_role_id }), flags: [64] });
    }

    const participants = await db.getParticipantUserIds(giveaway.id);
    if (participants.includes(interaction.user.id)) {
        await db.removeParticipant(giveaway.id, interaction.user.id);
        const newCount = await db.getParticipantCount(giveaway.id);
        const embed = createGiveawayEmbed(giveaway, newCount, lang);
        try {
            await interaction.editReply({ embeds: [embed], components: [createEntryButton(false, lang)] });
            return interaction.followUp({ content: t('giveaway.left_giveaway', lang), flags: [64] });
        } catch (err) {
            console.error('[Giveaway Error]:', err);
        }
        return;
    }

    await db.addParticipant(giveaway.id, interaction.user.id);

    // Interaction XP
    const { addXp, XP_AMOUNTS, sendLevelUpMessage } = require('../utils/leveling');
    const result = await addXp(interaction.member, XP_AMOUNTS.GAME_ACTION.min); // Use game action min for interactions
    if (result.leveledUp) {
        // Need a minimal adapter for sendLevelUpMessage
        const adapter = {
            author: interaction.user,
            channel: interaction.channel,
            guild: interaction.guild,
            reply: async (content) => interaction.followUp(content).catch(() => { })
        };
        sendLevelUpMessage(adapter, result, lang).catch(() => { });
    }

    const newCount = await db.getParticipantCount(giveaway.id);
    const embed = createGiveawayEmbed(giveaway, newCount, lang);
    try {
        await interaction.editReply({ embeds: [embed], components: [createEntryButton(false, lang)] });
        return interaction.followUp({ content: t('giveaway.joined_giveaway', lang), flags: [64] });
    } catch (err) {
        console.error('[Giveaway Error]:', err);
    }
}
