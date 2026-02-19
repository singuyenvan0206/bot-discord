const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Moderation commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers | PermissionFlagsBits.BanMembers | PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Kick a user')
                .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Reason for kicking')))
        .addSubcommand(sub =>
            sub.setName('ban')
                .setDescription('Ban a user')
                .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Reason for banning')))
        .addSubcommand(sub =>
            sub.setName('timeout')
                .setDescription('Timeout a user')
                .addUserOption(option => option.setName('user').setDescription('The user to timeout').setRequired(true))
                .addIntegerOption(option => option.setName('duration').setDescription('Duration in minutes').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Reason for timeout')))
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Delete messages')
                .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete').setRequired(true).setMinValue(1).setMaxValue(100))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'kick') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            if (!member) return interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
            if (!member.kickable) return interaction.reply({ content: '❌ I cannot kick this user. They may have a higher role than me.', ephemeral: true });

            await member.kick(reason);
            return interaction.reply({ content: `✅ **${user.tag}** has been kicked.\nReason: ${reason}` });
        }

        if (subcommand === 'ban') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            if (member && !member.bannable) return interaction.reply({ content: '❌ I cannot ban this user. They may have a higher role than me.', ephemeral: true });

            await interaction.guild.members.ban(user, { reason });
            return interaction.reply({ content: `✅ **${user.tag}** has been banned.\nReason: ${reason}` });
        }

        if (subcommand === 'timeout') {
            const user = interaction.options.getUser('user');
            const duration = interaction.options.getInteger('duration');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            if (!member) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
            if (!member.moderatable) return interaction.reply({ content: '❌ I cannot timeout this user.', ephemeral: true });

            await member.timeout(duration * 60 * 1000, reason);
            return interaction.reply({ content: `✅ **${user.tag}** has been timed out for **${duration} minutes**.\nReason: ${reason}` });
        }

        if (subcommand === 'clear') {
            const amount = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amount, true).catch(err => {
                console.error(err);
                return interaction.reply({ content: '❌ Failed to delete messages. They might be older than 14 days.', ephemeral: true });
            });

            return interaction.reply({ content: `✅ Deleted **${amount}** messages.`, ephemeral: true });
        }
    }
};
