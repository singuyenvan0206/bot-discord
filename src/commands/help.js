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
            '`$connect4` (`$c4`) — Play Connect 4',
            '`$memory` (`$mem`, `$match`) — Play Memory Match',
            '`$trivia` — Test your knowledge (Unlimited)',
            '`$emojiquiz` (`$quiz`) — Guess the movie/phrase',
            '`$poker` (`$pk`) — Multiplayer High Card Poker',
            '`$minesweeper` (`$mine`, `$ms`) — Classic Minesweeper',
            '`$hangman` (`$hang`, `$hm`) — Hangman (Unlimited words)',
            '`$wordchain` (`$wc`) — Multiplayer Word Chain',
            '`$scramble` (`$scram`) — Unscramble words (Unlimited)',
            '`$guess` (`$gn`) — Guess the number',
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
        // 1. Check if user wants specific command help
        if (args.length > 0) {
            const name = args[0].toLowerCase();
            const command = message.client.commands.get(name) ||
                message.client.commands.find(c => c.aliases && c.aliases.includes(name));

            if (!command) {
                return message.reply(`❌ Could not find command **${name}**!`);
            }

            const embed = new EmbedBuilder()
                .setTitle(`Command: $${command.name}`)
                .setDescription(command.description || 'No description provided')
                .setColor(0x3498DB)
                .addFields(
                    { name: '📝 Aliases', value: command.aliases ? command.aliases.map(a => `$${a}`).join(', ') : 'None', inline: true },
                    { name: '⏱️ Cooldown', value: `${command.cooldown || 3} seconds`, inline: true },
                    { name: '💡 Usage', value: `$${command.name} ${command.usage || ''}`, inline: false }
                )
                .setFooter({ text: 'Type $help to see all commands' });

            return message.reply({ embeds: [embed] });
        }

        // 2. Default Behavior: Show Category Menu
        const homeEmbed = new EmbedBuilder()
            .setTitle('🤖  Bot Help Menu')
            .setDescription('Select a category from the dropdown menu below to see available commands.\n\n💡 **Tip:** Type `$help <command>` for more details on a specific command!')
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
