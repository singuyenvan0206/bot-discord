const { Events, Collection, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
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

        // 1. Button Interactions
        if (interaction.isButton()) {
            // General Prison Check for Buttons
            if (isInPrison) {
                // Allow specific system-critical or info-related buttons/menus
                const exceptions = config.PRISON.BLOCK_EXCEPTIONS || [];
                const isAllowedPrefix = exceptions.some(cmd => interaction.customId.startsWith(`${cmd}_`));
                const isPagination = ['prev', 'next'].includes(interaction.customId);
                const isManualBail = interaction.customId.includes('bail') || interaction.customId.includes('check_dist_reward');

                if (!isAllowedPrefix && !isPagination && !isManualBail) {
                    return interaction.reply({
                        content: t('prison.lockdown_interaction', lang, { time: formatDuration(prisonUntil - nowSeconds, lang) }),
                        ephemeral: true
                    });
                }
            }

            if (interaction.customId === BUTTON_ID) {
                return handleButtonEntry(interaction);
            }
            if (interaction.customId === 'check_dist_reward') {
                const amount = user ? (user.last_dist_amount || 0) : 0;

                if (amount <= 0) {
                    return interaction.reply({
                        content: t('economy.no_reward_msg', lang) || "❌ Bạn không nhận được phần thưởng nào trong đợt này hoặc phần thưởng đã hết hạn.",
                        flags: [64]
                    });
                }

                return interaction.reply({
                    content: t('economy.ephemeral_reward_msg', lang, {
                        amount: amount.toLocaleString(),
                        emoji: config.EMOJIS.COIN
                    }) || `Bạn đã nhận được **${amount.toLocaleString()}** ${config.EMOJIS.COIN} từ đợt chia thưởng vừa rồi! 🎉`,
                    flags: [64]
                });
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
                        flags: [64]
                    });
                }
            }
            // All rank_ interactions are handled by the inline collector in rank.js
        }

        // 3. Slash Commands
        else if (interaction.isChatInputCommand()) {
            const commandName = interaction.commandName;

            // Check if bot is "shut down"
            const isStopped = await db.getGlobalSetting('bot_is_stopped') === 'true';
            if (isStopped && commandName !== 'startup' && commandName !== 'boot' && !await db.isOwner(interaction.user.id)) {
                return interaction.reply({ content: t('common.bot_shut_down', lang), flags: [64] });
            }

            const command = client.commands.get(commandName);
            if (!command) return;

            // Prison Lockdown check for Slash Commands
            if (isInPrison) {
                if (!config.PRISON.BLOCK_EXCEPTIONS.includes(commandName)) {
                    const timeLeft = formatDuration(prisonUntil - nowSeconds, lang);
                    return interaction.reply({
                        content: t('common.user_in_prison_global', lang, { time: timeLeft }),
                        flags: [64]
                    });
                }
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
                return interaction.reply({ content: t('common.no_permission', lang), flags: [64] });
            }

            const isServerOwner = interaction.user.id === interaction.guild.ownerId;
            const isBotOwner = await db.isOwner(interaction.user.id);
            const isAdmin = interaction.member.permissions.has('Administrator');

            if (command.adminOnly && !isServerOwner && !isBotOwner && !isAdmin) {
                return interaction.reply({ content: t('common.no_permission', lang), flags: [64] });
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
                if (now < expirationTime && !await db.isOwner(interaction.user.id)) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply({
                        content: t('common.cooldown', lang, { time: formatDuration(Math.ceil(timeLeft), lang) }),
                        flags: [64] // MessageFlags.Ephemeral
                    });
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
