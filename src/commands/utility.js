const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('utility')
        .setDescription('Useful utility commands')
        .addSubcommand(sub => sub.setName('ping').setDescription('Check the bot\'s latency'))
        .addSubcommand(sub => sub.setName('avatar').setDescription('View a user\'s avatar')
            .addUserOption(opt => opt.setName('target').setDescription('The user to view')))
        .addSubcommand(sub => sub.setName('serverinfo').setDescription('View server information'))
        .addSubcommand(sub => sub.setName('userinfo').setDescription('View user information')
            .addUserOption(opt => opt.setName('target').setDescription('The user to view'))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'ping') {
            const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
            const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
            const heartbeat = interaction.client.ws.ping;

            const embed = new EmbedBuilder()
                .setTitle('🏓  Pong!')
                .addFields(
                    { name: 'Roundtrip Latency', value: `${roundtrip}ms`, inline: true },
                    { name: 'WebSocket Heartbeat', value: `${heartbeat}ms`, inline: true }
                )
                .setColor(0x2ECC71);

            return interaction.editReply({ content: null, embeds: [embed] });
        }

        if (sub === 'avatar') {
            const user = interaction.options.getUser('target') || interaction.user;
            const embed = new EmbedBuilder()
                .setTitle(`${user.username}'s Avatar`)
                .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setColor(0x3498DB)
                .setFooter({ text: `Requested by ${interaction.user.tag}` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'serverinfo') {
            const guild = interaction.guild;
            const owner = await guild.fetchOwner();

            const embed = new EmbedBuilder()
                .setTitle(`ℹ️  Server Info: ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: 'Owner', value: `${owner.user.tag}`, inline: true },
                    { name: 'Members', value: `${guild.memberCount}`, inline: true },
                    { name: 'Created At', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
                    { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
                )
                .setColor(0x9B59B6)
                .setFooter({ text: `ID: ${guild.id}` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'userinfo') {
            const user = interaction.options.getUser('target') || interaction.user;
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            const embed = new EmbedBuilder()
                .setTitle(`ℹ️  User Info: ${user.tag}`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Joined Discord', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Not in server', inline: true },
                    { name: 'Roles', value: member ? member.roles.cache.map(r => r).join(' ').slice(0, 1024) || 'None' : 'N/A' }
                )
                .setColor(member ? member.displayHexColor : 0x95A5A6)
                .setFooter({ text: `ID: ${user.id}` });

            return interaction.reply({ embeds: [embed] });
        }
    }
};
