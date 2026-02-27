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
        const lang = getLanguage(interaction.user.id, interaction.guildId);

        // 1. Button Interactions (Giveaways)
        if (interaction.isButton() && interaction.customId === BUTTON_ID) {
            return handleButtonEntry(interaction);
        }

        // 2. Slash Commands
        if (interaction.isChatInputCommand()) {
            const commandName = interaction.commandName;
            const command = client.commands.get(commandName);
            if (!command) return;

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
            } else {
                const optionMap = {
                    'coinflip': ['choice', 'bet'],
                    '8ball': ['question'],
                    'transfer': ['user', 'amount'],
                    'buy': ['item'],
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
                        first: () => interaction.options.getUser('user') || interaction.options.getUser('target') || interaction.options.getUser('opponent') || null
                    }
                },
                reply: async (content) => {
                    try {
                        if (typeof content === 'string') content = { content, fetchReply: true };
                        else content = { ...content, fetchReply: true };

                        if (!hasReplied) {
                            hasReplied = true;
                            return await interaction.reply(content);
                        } else {
                            return await interaction.followUp(content);
                        }
                    } catch (err) {
                        if (typeof content === 'object') delete content.fetchReply;
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
            if (command.ownerOnly && !db.isOwner(interaction.user.id)) {
                return interaction.reply({ content: t('common.no_permission', lang), ephemeral: true });
            }

            if (command.adminOnly && !interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: t('common.no_permission', lang), ephemeral: true });
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
                        ephemeral: true
                    });
                }
            }

            if (!command.manualCooldown) {
                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            }

            try {
                await command.execute(messageAdapter, args);

                // Grant Command Success XP (Skip for admin/owner/utility commands to prevent imbalance)
                if (!command.ownerOnly && !command.adminOnly && !command.skipXp) {
                    const { addXp, XP_AMOUNTS, checkAndSendMilestone } = require('../utils/leveling');
                    const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.COMMAND_SUCCESS.max - XP_AMOUNTS.COMMAND_SUCCESS.min + 1)) + XP_AMOUNTS.COMMAND_SUCCESS.min;
                    const result = addXp(interaction.user.id, xpAmount);
                    if (result.leveledUp) {
                        await checkAndSendMilestone(messageAdapter, result.reachedLevel20, lang);
                    }
                }
            } catch (error) {
                console.error(`[Slash] Error executing /${commandName}:`, error);
                const errMsg = t('common.error', lang);
                if (!hasReplied) interaction.reply({ content: errMsg, ephemeral: true }).catch(() => { });
                else interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => { });

                // Grant Command Failure XP (Skip for admin/owner/utility commands)
                if (!command.ownerOnly && !command.adminOnly && !command.skipXp) {
                    const { addXp, XP_AMOUNTS, checkAndSendMilestone } = require('../utils/leveling');
                    const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.COMMAND_FAILURE.max - XP_AMOUNTS.COMMAND_FAILURE.min + 1)) + XP_AMOUNTS.COMMAND_FAILURE.min;
                    const result = addXp(interaction.user.id, xpAmount);
                    if (result.leveledUp) {
                        await checkAndSendMilestone(messageAdapter, result.reachedLevel20, lang);
                    }
                }
            }
        }

        // 3. Other Button Interactions
        else if (interaction.isButton()) {
            if (interaction.customId === 'check_dist_reward') {
                const user = db.getUser(interaction.user.id);
                const amount = user ? (user.last_dist_amount || 0) : 0;

                if (amount <= 0) {
                    return interaction.reply({
                        content: t('economy.no_reward_msg', lang) || "❌ Bạn không nhận được phần thưởng nào trong đợt này hoặc phần thưởng đã hết hạn.",
                        ephemeral: true
                    });
                }

                return interaction.reply({
                    content: t('economy.ephemeral_reward_msg', lang, {
                        amount: amount.toLocaleString(),
                        emoji: config.EMOJIS.COIN
                    }) || `Bạn đã nhận được **${amount.toLocaleString()}** ${config.EMOJIS.COIN} từ đợt chia thưởng vừa rồi! 🎉`,
                    ephemeral: true
                });
            }
        }

        // 4. Select Menu Interactions
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('rank_job_select_')) {
                try {
                    await interaction.deferUpdate();
                    const sortBy = interaction.customId.split('_').pop();
                    const jobId = interaction.values[0] === 'all' ? null : interaction.values[0];
                    const rankCmd = client.commands.get('rank');
                    const data = await rankCmd.getLeaderboardData(interaction.guild, sortBy, jobId, interaction.user.id, lang);
                    await interaction.editReply(data);
                } catch (e) {
                    console.error('[SelectMenu] EditReply Error:', e.message);
                }
                return;
            }

            if (interaction.customId.startsWith('rank_sort_select_')) {
                try {
                    await interaction.deferUpdate();
                    const jobIdPart = interaction.customId.split('_').pop();
                    const jobId = jobIdPart === 'all' ? null : jobIdPart;
                    const sortBy = interaction.values[0];
                    const rankCmd = client.commands.get('rank');
                    const data = await rankCmd.getLeaderboardData(interaction.guild, sortBy, jobId, interaction.user.id, lang);
                    await interaction.editReply(data);
                } catch (e) {
                    console.error('[SelectMenu] EditReply Error:', e.message);
                }
                return;
            }
        }
    },
};

async function handleButtonEntry(interaction) {
    const guildId = interaction.guildId;
    const lang = getLanguage(interaction.user.id, guildId);
    const giveaway = db.getGiveaway(interaction.message.id);

    if (!giveaway) return interaction.reply({ content: t('giveaway.not_exists', lang), ephemeral: true });
    if (giveaway.ended) return interaction.reply({ content: t('giveaway.already_ended_error', lang), ephemeral: true });
    if (giveaway.paused) return interaction.reply({ content: t('giveaway.paused_title', lang), ephemeral: true });

    if (giveaway.required_role_id && !interaction.member.roles.cache.has(giveaway.required_role_id)) {
        return interaction.reply({ content: t('giveaway.role_required_msg', lang, { roleId: giveaway.required_role_id }), ephemeral: true });
    }

    const participants = db.getParticipantUserIds(giveaway.id);
    if (participants.includes(interaction.user.id)) {
        db.removeParticipant(giveaway.id, interaction.user.id);
        const newCount = db.getParticipantCount(giveaway.id);
        const embed = createGiveawayEmbed(giveaway, newCount, lang);
        try {
            await interaction.update({ embeds: [embed], components: [createEntryButton(false, lang)] });
            return interaction.followUp({ content: t('giveaway.left_giveaway', lang), ephemeral: true });
        } catch (err) {
            return interaction.reply({ content: t('giveaway.left_giveaway', lang), ephemeral: true }).catch(() => { });
        }
    }

    db.addParticipant(giveaway.id, interaction.user.id);

    // Grant Entry XP
    const { addXp, XP_AMOUNTS, checkAndSendMilestone } = require('../utils/leveling');
    const result = addXp(interaction.user.id, XP_AMOUNTS.MESSAGE.min); // Minimal XP for joining giveaway
    if (result.leveledUp) {
        await checkAndSendMilestone(interaction, result.reachedLevel20, lang);
    }

    const newCount = db.getParticipantCount(giveaway.id);
    const embed = createGiveawayEmbed(giveaway, newCount, lang);
    try {
        await interaction.update({ embeds: [embed], components: [createEntryButton(false, lang)] });
        return interaction.followUp({ content: t('giveaway.joined_giveaway', lang), ephemeral: true });
    } catch (err) {
        return interaction.reply({ content: t('giveaway.joined_giveaway', lang), ephemeral: true }).catch(() => { });
    }
}
