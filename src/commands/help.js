const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

const categories = {
    giveaway: {
        label: 'Generic',
        description: 'Giveaway commands',
        emoji: '🎉',
        commands: [
            '`!gstart <duration> <prize>` — Start a giveaway',
            '`!gend <message_id>` — End a giveaway early',
            '`!greroll <message_id>` — Re-roll winners',
            '`!glist` — List active giveaways',
            '`!gdelete <message_id>` — Delete a giveaway',
            '`!gpause <message_id>` — Pause a giveaway',
            '`!gresume <message_id>` — Resume a giveaway',
            '`!ginfo <message_id>` — Show giveaway info',
        ]
    },
    fun: {
        label: 'Fun',
        description: 'Mini-games and fun commands',
        emoji: '🎮',
        commands: [
            '`!coinflip` — Flip a coin',
            '`!dice` — Roll dice',
            '`!8ball` — Ask the magic 8-ball',
            '`!rps` — Rock Paper Scissors',
            '`!trivia` — Play a trivia game',
            '`!guess` — Guess the number',
            '`!wyr` — Would You Rather',
            '`!scramble` — Unscramble words',
            '`!blackjack` — Play Blackjack',
            '`!ttt` — Tic-Tac-Toe',
            '`!slots` — Spin the slots',
            '`!reaction` — Test reaction time',
            '`!wordchain` — Word chain game',
        ]
    },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of all available commands'),

    async execute(interaction) {
        const homeEmbed = new EmbedBuilder()
            .setTitle('🤖  Bot Help Menu')
            .setDescription('Select a category from the dropdown menu below to see available commands.')
            .setColor(0x5865F2)
            .addFields({ name: '🔗 Links', value: '[Support Server](https://discord.gg/example) • [Invite Bot](https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands)' })
            .setThumbnail(interaction.client.user.displayAvatarURL());

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Select a category...')
            .addOptions(
                Object.entries(categories).map(([key, value]) => ({
                    label: value.label,
                    description: value.description,
                    value: key,
                    emoji: value.emoji,
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({
            embeds: [homeEmbed],
            components: [row],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000
        });

        collector.on('collect', async i => {
            const selection = i.values[0];
            const category = categories[selection];

            const categoryEmbed = new EmbedBuilder()
                .setTitle(`${category.emoji}  ${category.label} Commands`)
                .setDescription(category.commands.join('\n'))
                .setColor(0x5865F2)
                .setFooter({ text: 'Select "Home" to go back (or wait for timeout)' });

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', () => {
            // Disable the select menu after timeout
            const disabledRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true).setPlaceholder('Help session expired')
            );
            interaction.editReply({ components: [disabledRow] }).catch(() => { });
        });
    }
};
