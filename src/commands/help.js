const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

const categories = {
    fun: {
        label: 'Fun & Games',
        description: 'Mini-games and activities',
        emoji: '🎮',
        commands: [
            '`$coinflip` (`$cf`, `$flip`) — Flip a coin',
            '`$dice` (`$roll`) — Roll dice',
            '`$rps` (`$rock`) — Rock Paper Scissors',
            '`$blackjack` (`$bj`) — Play Blackjack',
            '`$slots` — Spin the slots',
            '`$tictactoe` (`$ttt`) — Play Tic-Tac-Toe',
            '`$trivia` — Test your knowledge',
            '`$emojiquiz` (`$quiz`) — Guess the movie/phrase',
            '`$poker` (`$pk`) — Multiplayer High Card Poker',
            '`$minesweeper` (`$mine`, `$ms`) — Classic Minesweeper',
            '`$hangman` (`$hang`, `$hm`) — Classic Hangman',
            '`$wordchain` (`$wc`) — Multiplayer Word Chain',
            '`$scramble` (`$scram`) — Unscramble words',
            '`$guess` (`$gn`) — Guess the number',
            '`$math` — Solve math problems',
            '`$reaction` (`$react`) — Test reaction speed',
        ]
    },
    economy: {
        label: 'Economy',
        description: 'Money, jobs, and trading',
        emoji: '💰',
        commands: [
            '`$balance` (`$bal`, `$bl`) — Check your wallet and bank',
            '`$daily` (`$d`, `$dy`) — Claim daily reward',
            '`$work` (`$w`, `$wk`) — Work to earn money',
            '`$shop` (`$sh`, `$store`) — Browse items',
            '`$buy` (`$b`) <id> — Buy an item',
            '`$inventory` (`$inv`) — View your inventory',
            '`$transfer` (`$pay`, `$tf`) <user> <amount> — Send money',
            '`$leaderboard` (`$lb`, `$top`) — View richest users',
        ]
    },
    utility: {
        label: 'Utility',
        description: 'Useful tools',
        emoji: '🔧',
        commands: [
            '`$ping` (`$p`) — Check bot latency',
            '`$serverinfo` — View server stats',
            '`$userinfo` (`$user`, `$ui`) [user] — View user stats',
            '`$avatar` (`$av`) [user] — View user avatar',
        ]
    },
    giveaway: {
        label: 'Giveaway',
        description: 'Host and manage giveaways',
        emoji: '🎉',
        commands: [
            '`$giveaway` (`$g`) start <time> <winners> <prize>`',
            '`$giveaway` (`$g`) end <message_id>`',
            '`$giveaway` (`$g`) reroll <message_id>`',
            '`$giveaway` (`$g`) list`',
            '`$giveaway` (`$g`) pause <message_id>`',
            '`$giveaway` (`$g`) resume <message_id>`',
            '`$giveaway` (`$g`) delete <message_id>`',
        ]
    },
};

module.exports = {
    name: 'help',
    description: 'Shows a list of all available commands',
    async execute(message, args) {
        const homeEmbed = new EmbedBuilder()
            .setTitle('🤖  Bot Help Menu')
            .setDescription('Select a category from the dropdown menu below to see available commands.')
            .setColor(0x5865F2)
            .addFields({ name: '🔗 Links', value: '[Support Server](https://discord.gg/) • [Invite Bot](https://discord.com/oauth2/authorize?client_id=' + message.client.user.id + '&permissions=8&scope=bot%20applications.commands)' })
            .setThumbnail(message.client.user.displayAvatarURL())
            .setFooter({ text: 'All commands use the prefix "$"' });

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

        const response = await message.reply({
            embeds: [homeEmbed],
            components: [row]
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            const selection = i.values[0];
            const category = categories[selection];

            const categoryEmbed = new EmbedBuilder()
                .setTitle(`${category.emoji}  ${category.label} Commands`)
                .setDescription(category.commands.join('\n'))
                .setColor(0x5865F2)
                .setFooter({ text: 'Select another category to switch views' });

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true).setPlaceholder('Help session expired')
            );
            response.edit({ components: [disabledRow] }).catch(() => { });
        });
    }
};
