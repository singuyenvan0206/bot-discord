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
            } else {
                const optionMap = {
                    'coinflip': ['choice', 'bet'],
                    '8ball': ['question'],
                    'transfer': ['user', 'amount'],
                    'buy': ['item'],
                    'blackjack': ['bet'], 'poker': ['bet'], 'dice': ['bet'],
                    'slots': ['bet'], 'minesweeper': ['bet'],
                    'balance': ['user'], 'avatar': ['user'], 'userinfo': ['user'],
                    'help': ['command'],
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
                        first: () => interaction.options.getUser('user') || null
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
            } catch (error) {
                console.error(`[Slash] Error executing /${commandName}:`, error);
                const errMsg = t('common.error', lang);
                if (!hasReplied) interaction.reply({ content: errMsg, ephemeral: true }).catch(() => { });
                else interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => { });
            }
        }

        // 3. Other Button Interactions
        else if (interaction.isButton()) {
            if (interaction.customId === 'choose_job_btn') {
                const user = db.getUser(interaction.user.id);
                if (user.level < 20) {
                    return interaction.reply({
                        content: t('job.set_error_level', lang, { level: 20 }),
                        ephemeral: !!interaction.guildId
                    });
                }

                const jobs = config.ECONOMY.JOBS;
                const select = new StringSelectMenuBuilder()
                    .setCustomId('job_select')
                    .setPlaceholder(t('job.select_placeholder', lang))
                    .addOptions(
                        Object.values(jobs).map(j => ({
                            label: j.id.charAt(0).toUpperCase() + j.id.slice(1),
                            description: t(`job.info_${j.id}`, lang).substring(0, 100),
                            value: j.id,
                            emoji: j.icon
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(select);
                return await interaction.reply({
                    content: t('job.milestone_desc', lang),
                    components: [row],
                    ephemeral: !!interaction.guildId
                });
            }
        }

        // 4. Select Menu Interactions
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'job_select') {
                const jobId = interaction.values[0];
                const job = config.ECONOMY.JOBS[jobId];
                if (!job) return interaction.reply({ content: t('job.set_error_invalid', lang), ephemeral: true });

                db.updateUser(interaction.user.id, { job: jobId });
                return interaction.update({
                    content: t('job.set_success', lang, { job: jobId.charAt(0).toUpperCase() + jobId.slice(1) }),
                    components: []
                });
            }

            if (interaction.customId.startsWith('rank_job_select_')) {
                const sortBy = interaction.customId.split('_').pop();
                const jobId = interaction.values[0] === 'all' ? null : interaction.values[0];
                const rankCmd = client.commands.get('rank');
                const data = await rankCmd.getLeaderboardData(interaction.guild, sortBy, jobId, interaction.user.id, lang);
                return interaction.update(data);
            }

            if (interaction.customId.startsWith('rank_sort_select_')) {
                const jobIdPart = interaction.customId.split('_').pop();
                const jobId = jobIdPart === 'all' ? null : jobIdPart;
                const sortBy = interaction.values[0];
                const rankCmd = client.commands.get('rank');
                const data = await rankCmd.getLeaderboardData(interaction.guild, sortBy, jobId, interaction.user.id, lang);
                return interaction.update(data);
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
    const newCount = db.getParticipantCount(giveaway.id);
    const embed = createGiveawayEmbed(giveaway, newCount, lang);
    try {
        await interaction.update({ embeds: [embed], components: [createEntryButton(false, lang)] });
        return interaction.followUp({ content: t('giveaway.joined_giveaway', lang), ephemeral: true });
    } catch (err) {
        return interaction.reply({ content: t('giveaway.joined_giveaway', lang), ephemeral: true }).catch(() => { });
    }
}
