const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const db = require('../database');
const { EMOJI, createGiveawayEmbed, createPausedEmbed, createEndedEmbed, createWinnerAnnouncementEmbed, createInfoStatsEmbed, createScheduledEmbed, createErrorEmbed, createInfoEmbed, createEntryButton } = require('../utils/embeds');
const { pickWinners, finishGiveaway } = require('../utils/timer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        // ── /giveaway start ──────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(opt =>
                    opt.setName('prize')
                        .setDescription('What is the prize?')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('duration')
                        .setDescription('How long? (e.g. 1h, 30m, 1d, 2h30m)')
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('winners')
                        .setDescription('Number of winners (default: 1)')
                        .setMinValue(1)
                        .setMaxValue(20))
                .addStringOption(opt =>
                    opt.setName('description')
                        .setDescription('Extra details about the giveaway'))
                .addRoleOption(opt =>
                    opt.setName('required_role')
                        .setDescription('Role required to enter'))
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Channel to host the giveaway in (default: current channel)'))
                .addStringOption(opt =>
                    opt.setName('start_time')
                        .setDescription('Schedule start (e.g. "30m", "2h", "1d") — giveaway begins later')))

        // ── /giveaway end ────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(opt =>
                    opt.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true)))

        // ── /giveaway reroll ─────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('reroll')
                .setDescription('Re-roll winners for a completed giveaway')
                .addStringOption(opt =>
                    opt.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('winners')
                        .setDescription('Number of new winners (default: same as original)')
                        .setMinValue(1)
                        .setMaxValue(20)))

        // ── /giveaway list ───────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all active giveaways in this server'))

        // ── /giveaway delete ─────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Delete a giveaway')
                .addStringOption(opt =>
                    opt.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true)))

        // ── /giveaway pause ──────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('pause')
                .setDescription('Pause an active giveaway')
                .addStringOption(opt =>
                    opt.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true)))

        // ── /giveaway resume ─────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('resume')
                .setDescription('Resume a paused giveaway')
                .addStringOption(opt =>
                    opt.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true)))

        // ── /giveaway info ───────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Show detailed info about a giveaway')
                .addStringOption(opt =>
                    opt.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true)))

        // ── /giveaway edit ───────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Edit an active giveaway')
                .addStringOption(opt =>
                    opt.setName('message_id')
                        .setDescription('Message ID of the giveaway')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('prize')
                        .setDescription('New prize name'))
                .addStringOption(opt =>
                    opt.setName('description')
                        .setDescription('New description'))
                .addStringOption(opt =>
                    opt.setName('duration')
                        .setDescription('New duration from now (e.g. 1h, 30m)'))
                .addIntegerOption(opt =>
                    opt.setName('winners')
                        .setDescription('New winner count')
                        .setMinValue(1)
                        .setMaxValue(20))),

    // ═══════════════════════════════════════════════════════════════
    // Command Execution
    // ═══════════════════════════════════════════════════════════════
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'start': return handleStart(interaction);
            case 'end': return handleEnd(interaction);
            case 'reroll': return handleReroll(interaction);
            case 'list': return handleList(interaction);
            case 'delete': return handleDelete(interaction);
            case 'pause': return handlePause(interaction);
            case 'resume': return handleResume(interaction);
            case 'info': return handleInfo(interaction);
            case 'edit': return handleEdit(interaction);
        }
    },
};

// ─── /giveaway start ─────────────────────────────────────────────

async function handleStart(interaction) {
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners') || 1;
    const description = interaction.options.getString('description') || null;
    const requiredRole = interaction.options.getRole('required_role');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const startTimeStr = interaction.options.getString('start_time');

    // Parse duration
    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs < 10_000) {
        return interaction.reply({
            embeds: [createErrorEmbed('Invalid duration. Use formats like `1h`, `30m`, `1d`, `2h30m`. Minimum is 10 seconds.')],
            ephemeral: true,
        });
    }

    if (durationMs > 30 * 24 * 60 * 60 * 1000) {
        return interaction.reply({
            embeds: [createErrorEmbed('Duration cannot exceed 30 days.')],
            ephemeral: true,
        });
    }

    // Parse scheduled start time
    let scheduledStart = null;
    if (startTimeStr) {
        const startDelayMs = parseDuration(startTimeStr);
        if (!startDelayMs || startDelayMs < 10_000) {
            return interaction.reply({
                embeds: [createErrorEmbed('Invalid start time. Use formats like `30m`, `1h`, `1d`.')],
                ephemeral: true,
            });
        }
        scheduledStart = Math.floor((Date.now() + startDelayMs) / 1000);
    }

    const endsAt = scheduledStart
        ? Math.floor((scheduledStart * 1000 + durationMs) / 1000)
        : Math.floor((Date.now() + durationMs) / 1000);

    await interaction.deferReply({ ephemeral: true });

    const giveawayData = {
        guild_id: interaction.guildId,
        channel_id: channel.id,
        host_id: interaction.user.id,
        prize,
        description,
        winner_count: winnerCount,
        required_role_id: requiredRole?.id || null,
        ends_at: endsAt,
        scheduled_start: scheduledStart,
    };

    if (scheduledStart) {
        // Scheduled giveaway — send a "coming soon" embed
        const embed = createScheduledEmbed(giveawayData);
        const giveawayMessage = await channel.send({ embeds: [embed] });

        giveawayData.message_id = giveawayMessage.id;
        db.createGiveaway({
            guildId: interaction.guildId,
            channelId: channel.id,
            messageId: giveawayMessage.id,
            hostId: interaction.user.id,
            prize,
            description,
            winnerCount,
            requiredRoleId: requiredRole?.id || null,
            endsAt,
            scheduledStart,
        });

        // Update embed with actual message ID
        const saved = db.getGiveaway(giveawayMessage.id);
        const updatedEmbed = createScheduledEmbed(saved);
        await giveawayMessage.edit({ embeds: [updatedEmbed] });

        await interaction.editReply({
            embeds: [createInfoEmbed(`Giveaway scheduled in ${channel}! Starts <t:${scheduledStart}:R>. Prize: **${prize}**`)],
        });
    } else {
        // Immediate giveaway
        const embed = createGiveawayEmbed(giveawayData, 0);
        const buttonRow = createEntryButton();
        const giveawayMessage = await channel.send({ embeds: [embed], components: [buttonRow] });
        await giveawayMessage.react(EMOJI);

        db.createGiveaway({
            guildId: interaction.guildId,
            channelId: channel.id,
            messageId: giveawayMessage.id,
            hostId: interaction.user.id,
            prize,
            description,
            winnerCount,
            requiredRoleId: requiredRole?.id || null,
            endsAt,
        });

        const saved = db.getGiveaway(giveawayMessage.id);
        const updatedEmbed = createGiveawayEmbed(saved, 0);
        await giveawayMessage.edit({ embeds: [updatedEmbed], components: [buttonRow] });

        await interaction.editReply({
            embeds: [createInfoEmbed(`Giveaway started in ${channel}! Prize: **${prize}**`)],
        });
    }
}

// ─── /giveaway end ───────────────────────────────────────────────

async function handleEnd(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.getGiveaway(messageId);

    if (!giveaway) {
        return interaction.reply({
            embeds: [createErrorEmbed('Giveaway not found. Make sure you provided the correct message ID.')],
            ephemeral: true,
        });
    }

    if (giveaway.guild_id !== interaction.guildId) {
        return interaction.reply({
            embeds: [createErrorEmbed('That giveaway does not belong to this server.')],
            ephemeral: true,
        });
    }

    if (giveaway.ended) {
        return interaction.reply({
            embeds: [createErrorEmbed('That giveaway has already ended.')],
            ephemeral: true,
        });
    }

    await interaction.deferReply({ ephemeral: true });
    await finishGiveaway(interaction.client, giveaway);

    await interaction.editReply({
        embeds: [createInfoEmbed(`Giveaway for **${giveaway.prize}** has been ended!`)],
    });
}

// ─── /giveaway reroll ────────────────────────────────────────────

async function handleReroll(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.getGiveaway(messageId);

    if (!giveaway) {
        return interaction.reply({
            embeds: [createErrorEmbed('Giveaway not found.')],
            ephemeral: true,
        });
    }

    if (giveaway.guild_id !== interaction.guildId) {
        return interaction.reply({
            embeds: [createErrorEmbed('That giveaway does not belong to this server.')],
            ephemeral: true,
        });
    }

    if (!giveaway.ended) {
        return interaction.reply({
            embeds: [createErrorEmbed('That giveaway is still active. Use `/giveaway end` first.')],
            ephemeral: true,
        });
    }

    const winnerCount = interaction.options.getInteger('winners') || giveaway.winner_count;
    const participants = db.getParticipantUserIds(giveaway.id);

    if (participants.length === 0) {
        return interaction.reply({
            embeds: [createErrorEmbed('No participants in this giveaway — cannot reroll.')],
            ephemeral: true,
        });
    }

    const newWinners = pickWinners(participants, winnerCount);

    await interaction.deferReply();

    // Update the original giveaway embed
    try {
        const channel = await interaction.guild.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);
        const endedEmbed = createEndedEmbed(giveaway, newWinners, participants.length);
        await message.edit({ embeds: [endedEmbed], components: [] });
    } catch {
        // Can't update original — that's okay
    }

    const announcementEmbed = createWinnerAnnouncementEmbed(giveaway, newWinners);
    await interaction.editReply({
        content: `🎉 New winner${newWinners.length !== 1 ? 's' : ''}: ${newWinners.map(id => `<@${id}>`).join(', ')}`,
        embeds: [announcementEmbed],
    });
}

// ─── /giveaway list ──────────────────────────────────────────────

async function handleList(interaction) {
    const giveaways = db.getActiveGiveaways(interaction.guildId);

    if (giveaways.length === 0) {
        return interaction.reply({
            embeds: [createInfoEmbed('No active giveaways in this server.')],
            ephemeral: true,
        });
    }

    const { EmbedBuilder } = require('discord.js');
    const { formatTimestamp } = require('../utils/embeds');

    const lines = giveaways.map((g, i) => {
        const count = db.getParticipantCount(g.id);
        const status = g.paused ? '⏸️ Paused' : '🟢 Active';
        return [
            `**${i + 1}. ${g.prize}** — ${status}`,
            `   📥 ${count} entries • 🏆 ${g.winner_count} winner${g.winner_count !== 1 ? 's' : ''}`,
            `   ⏰ Ends ${formatTimestamp(g.ends_at)} • [Jump](https://discord.com/channels/${g.guild_id}/${g.channel_id}/${g.message_id})`,
        ].join('\n');
    });

    const embed = new EmbedBuilder()
        .setTitle('📋  Active Giveaways')
        .setDescription(lines.join('\n\n'))
        .setColor(0x5865F2)
        .setFooter({ text: `${giveaways.length} active giveaway${giveaways.length !== 1 ? 's' : ''}` })
        .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── /giveaway delete ────────────────────────────────────────────

async function handleDelete(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.getGiveaway(messageId);

    if (!giveaway) {
        return interaction.reply({
            embeds: [createErrorEmbed('Giveaway not found.')],
            ephemeral: true,
        });
    }

    if (giveaway.guild_id !== interaction.guildId) {
        return interaction.reply({
            embeds: [createErrorEmbed('That giveaway does not belong to this server.')],
            ephemeral: true,
        });
    }

    try {
        const channel = await interaction.guild.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);
        await message.delete();
    } catch {
        // Message already deleted or inaccessible
    }

    db.deleteGiveaway(messageId);

    return interaction.reply({
        embeds: [createInfoEmbed(`Giveaway for **${giveaway.prize}** has been deleted.`)],
        ephemeral: true,
    });
}

// ─── /giveaway pause ────────────────────────────────────────────

async function handlePause(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.getGiveaway(messageId);

    if (!giveaway) {
        return interaction.reply({ embeds: [createErrorEmbed('Giveaway not found.')], ephemeral: true });
    }
    if (giveaway.guild_id !== interaction.guildId) {
        return interaction.reply({ embeds: [createErrorEmbed('That giveaway does not belong to this server.')], ephemeral: true });
    }
    if (giveaway.ended) {
        return interaction.reply({ embeds: [createErrorEmbed('That giveaway has already ended.')], ephemeral: true });
    }
    if (giveaway.paused) {
        return interaction.reply({ embeds: [createErrorEmbed('That giveaway is already paused.')], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    db.pauseGiveaway(messageId);

    // Update embed to show paused state
    try {
        const channel = await interaction.guild.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);
        const count = db.getParticipantCount(giveaway.id);
        const pausedEmbed = createPausedEmbed(giveaway, count);
        const disabledButton = createEntryButton(true);
        await message.edit({ embeds: [pausedEmbed], components: [disabledButton] });
    } catch {
        // Can't update message
    }

    await interaction.editReply({
        embeds: [createInfoEmbed(`Giveaway for **${giveaway.prize}** has been paused.`)],
    });
}

// ─── /giveaway resume ───────────────────────────────────────────

async function handleResume(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.getGiveaway(messageId);

    if (!giveaway) {
        return interaction.reply({ embeds: [createErrorEmbed('Giveaway not found.')], ephemeral: true });
    }
    if (giveaway.guild_id !== interaction.guildId) {
        return interaction.reply({ embeds: [createErrorEmbed('That giveaway does not belong to this server.')], ephemeral: true });
    }
    if (giveaway.ended) {
        return interaction.reply({ embeds: [createErrorEmbed('That giveaway has already ended.')], ephemeral: true });
    }
    if (!giveaway.paused) {
        return interaction.reply({ embeds: [createErrorEmbed('That giveaway is not paused.')], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    db.resumeGiveaway(messageId);

    // Update embed back to active state
    try {
        const channel = await interaction.guild.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);
        const count = db.getParticipantCount(giveaway.id);
        const updated = db.getGiveaway(messageId);
        const activeEmbed = createGiveawayEmbed(updated, count);
        const buttonRow = createEntryButton();
        await message.edit({ embeds: [activeEmbed], components: [buttonRow] });
    } catch {
        // Can't update message
    }

    await interaction.editReply({
        embeds: [createInfoEmbed(`Giveaway for **${giveaway.prize}** has been resumed!`)],
    });
}

// ─── /giveaway info ──────────────────────────────────────────────

async function handleInfo(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.getGiveaway(messageId);

    if (!giveaway) {
        return interaction.reply({ embeds: [createErrorEmbed('Giveaway not found.')], ephemeral: true });
    }
    if (giveaway.guild_id !== interaction.guildId) {
        return interaction.reply({ embeds: [createErrorEmbed('That giveaway does not belong to this server.')], ephemeral: true });
    }

    const participantCount = db.getParticipantCount(giveaway.id);
    const totalEntries = db.getTotalEntries(giveaway.id);
    const embed = createInfoStatsEmbed(giveaway, participantCount, totalEntries);

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── /giveaway edit ──────────────────────────────────────────────

async function handleEdit(interaction) {
    const messageId = interaction.options.getString('message_id');
    const giveaway = db.getGiveaway(messageId);

    if (!giveaway) {
        return interaction.reply({ embeds: [createErrorEmbed('Giveaway not found.')], ephemeral: true });
    }
    if (giveaway.guild_id !== interaction.guildId) {
        return interaction.reply({ embeds: [createErrorEmbed('That giveaway does not belong to this server.')], ephemeral: true });
    }
    if (giveaway.ended) {
        return interaction.reply({ embeds: [createErrorEmbed('Cannot edit an ended giveaway.')], ephemeral: true });
    }

    const newPrize = interaction.options.getString('prize');
    const newDescription = interaction.options.getString('description');
    const newDurationStr = interaction.options.getString('duration');
    const newWinners = interaction.options.getInteger('winners');

    if (!newPrize && !newDescription && !newDurationStr && !newWinners) {
        return interaction.reply({ embeds: [createErrorEmbed('You must provide at least one field to edit.')], ephemeral: true });
    }

    const updates = {};
    if (newPrize) updates.prize = newPrize;
    if (newDescription) updates.description = newDescription;
    if (newWinners) updates.winnerCount = newWinners;
    if (newDurationStr) {
        const durationMs = parseDuration(newDurationStr);
        if (!durationMs || durationMs < 10_000) {
            return interaction.reply({ embeds: [createErrorEmbed('Invalid duration.')], ephemeral: true });
        }
        updates.endsAt = Math.floor((Date.now() + durationMs) / 1000);
    }

    await interaction.deferReply({ ephemeral: true });

    db.updateGiveaway(messageId, updates);

    // Refresh the embed
    try {
        const updated = db.getGiveaway(messageId);
        const channel = await interaction.guild.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);
        const count = db.getParticipantCount(giveaway.id);

        if (updated.paused) {
            const embed = createPausedEmbed(updated, count);
            await message.edit({ embeds: [embed], components: [createEntryButton(true)] });
        } else {
            const embed = createGiveawayEmbed(updated, count);
            await message.edit({ embeds: [embed], components: [createEntryButton()] });
        }
    } catch {
        // Can't update message
    }

    const changes = [];
    if (newPrize) changes.push(`Prize → **${newPrize}**`);
    if (newDescription) changes.push(`Description updated`);
    if (newWinners) changes.push(`Winners → **${newWinners}**`);
    if (newDurationStr) changes.push(`Duration → **${newDurationStr}** from now`);

    await interaction.editReply({
        embeds: [createInfoEmbed(`Giveaway updated!\n${changes.join('\n')}`)],
    });
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseDuration(str) {
    const simple = ms(str);
    if (simple) return simple;

    const regex = /(\d+)\s*(d|h|m|s)/gi;
    let total = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
        const val = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        switch (unit) {
            case 'd': total += val * 86400000; break;
            case 'h': total += val * 3600000; break;
            case 'm': total += val * 60000; break;
            case 's': total += val * 1000; break;
        }
    }

    return total || null;
}
