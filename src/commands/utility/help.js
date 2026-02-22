const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../config');
const { t, getLanguage } = require('../utils/i18n');
const db = require('../database');
const { formatDuration } = require('../utils/time');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    aliases: ['h'],
    description: 'Hiển thị danh sách lệnh',
    async execute(message, args) {
        const prefix = config.PREFIX;
        const lang = getLanguage(message.author.id, message.guild?.id);
        const isOwner = db.isOwner(message.author.id);

        // 1. Dynamic Command Discovery
        const categories = {
            fun: { label: t('help.categories.fun.label', lang), description: t('help.categories.fun.description', lang), emoji: '🎮', commands: [] },
            economy: { label: t('help.categories.economy.label', lang), description: t('help.categories.economy.description', lang), emoji: '💰', commands: [] },
            utility: { label: t('help.categories.utility.label', lang), description: t('help.categories.utility.description', lang), emoji: '🔧', commands: [] },
            giveaway: { label: t('help.categories.giveaway.label', lang), description: t('help.categories.giveaway.description', lang), emoji: '🎉', commands: [] }
        };

        if (isOwner) {
            categories.owner = { label: t('help.categories.owner.label', lang), description: t('help.categories.owner.description', lang), emoji: '👑', commands: [] };
        }

        // Map commands to categories based on their folder
        const commandsPath = path.join(__dirname, '../commands');
        const commandFolders = fs.readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            if (!fs.lstatSync(folderPath).isDirectory()) continue;
            if (folder === 'owner' && !isOwner) continue;
            if (!categories[folder]) continue;

            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(`./${folder}/${file}`);
                let cmdStr = `\`${prefix}${command.name}\``;
                if (command.aliases && command.aliases.length > 0) {
                    cmdStr += ` (\`${command.aliases.map(a => `${prefix}${a}`).join('`, `')}\`)`;
                }
                categories[folder].commands.push(cmdStr);
            }
        }

        // 2. Specific Command Help
        if (args.length > 0) {
            const name = args[0].toLowerCase();
            const command = message.client.commands.get(name) ||
                message.client.commands.find(c => c.aliases && c.aliases.includes(name));

            if (!command) {
                return message.reply(`❌ Could not find command **${name}**!`);
            }

            const guide = t(`help.guides.${command.name}`, lang).replace(/\$/g, prefix);
            const usage = command.usage || '';
            const description = t(`help.descriptions.${command.name}`, lang) || command.description || t('help.no_description', lang);

            // Find category emoji
            let categoryEmoji = '❓';
            for (const cat of Object.values(categories)) {
                if (cat.commands.some(c => c.includes(`\`${prefix}${command.name}\``))) {
                    categoryEmoji = cat.emoji;
                    break;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(t('help.title', lang, { emoji: '📖', prefix, name: command.name }))
                .setDescription(description)
                .setColor(config.COLORS.INFO)
                .addFields(
                    { name: `📝 ${t('help.aliases', lang)}`, value: command.aliases ? command.aliases.map(a => `\`${prefix}${a}\``).join(', ') : t('help.none', lang), inline: true },
                    { name: `⏱️ ${t('help.cooldown', lang)}`, value: `${formatDuration(command.cooldown || config.ECONOMY.DEFAULT_COOLDOWN, lang)}`, inline: true },
                    { name: `💡 ${t('help.usage_title', lang)}`, value: `\`${prefix}${command.name}${usage ? ' ' + usage : ''}\``.trim(), inline: true }
                );

            if (command.subcommands) {
                const subs = Object.entries(command.subcommands).map(([sub, desc]) => `• \`${prefix}${command.name} ${sub}\`: ${desc}`).join('\n');
                embed.addFields({ name: t('help.subcommands_title', lang), value: subs, inline: false });
            }

            embed.addFields({ name: `🔍 ${t('help.guide_title', lang)}`, value: guide.startsWith('help.guides') ? t('help.no_guide', lang) : guide, inline: false });

            if (command.examples) {
                embed.addFields({ name: t('help.examples_title', lang), value: command.examples.map(ex => `\`${prefix}${command.name} ${ex}\``).join('\n'), inline: false });
            }

            embed.setFooter({ text: t('help.footer_all', lang, { prefix }) });

            return message.reply({ embeds: [embed] });
        }

        // 3. Home View with Random Tip
        const tips = t('help.tips', lang);
        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        const generateHomeEmbed = () => new EmbedBuilder()
            .setTitle(t('help.menu_title', lang, { emoji: '📖' }))
            .setDescription(`${t('help.menu_desc', lang, { prefix })}\n\n` +
                `**${t('help.tip_title', lang)}:**\n> *${randomTip}*\n\n` +
                `**🚀 ${t('help.stats_title', lang)}:**\n` +
                `> 📋 **${t('help.stats_commands', lang)}:** ${message.client.commands.size}\n` +
                `> 🌐 **${t('help.stats_servers', lang)}:** ${message.client.guilds.cache.size}\n` +
                `> 👥 **${t('help.stats_users', lang)}:** ${message.client.users.cache.size}`)
            .setColor(config.COLORS.INFO)
            .addFields(
                { name: `🔗 ${t('help.quick_links', lang)}`, value: `[${t('help.support_server', lang)}](https://discord.gg/) • [${t('help.invite_bot', lang)}](https://discord.com/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands)`, inline: false }
            )
            .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: t('help.footer_home', lang, { prefix }), iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder(t('help.menu_placeholder', lang))
            .addOptions([
                {
                    label: t('help.home', lang),
                    description: t('help.home_desc', lang),
                    value: 'home',
                    emoji: '🏠'
                },
                ...Object.entries(categories).map(([key, value]) => ({
                    label: value.label,
                    description: value.description,
                    value: key,
                    emoji: value.emoji,
                }))
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await message.reply({
            embeds: [generateHomeEmbed()],
            components: [row]
        });

        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120000
        });

        collector.on('collect', async i => {
            if (i.values[0] === 'home') {
                return await i.update({ embeds: [generateHomeEmbed()], components: [row] });
            }

            const category = categories[i.values[0]];
            const categoryEmbed = new EmbedBuilder()
                .setAuthor({ name: `${category.label}`, iconURL: message.client.user.displayAvatarURL() })
                .setTitle(`${category.emoji}  ${category.label}`)
                .setDescription(`*${category.description}*\n\n${category.commands.join('\n').replace(/\$/g, prefix)}`)
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.client.user.displayAvatarURL())
                .setFooter({ text: t('help.footer_category', lang) })
                .setTimestamp();

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true).setPlaceholder(t('help.session_expired', lang))
            );
            response.edit({ components: [disabledRow] }).catch(() => { });
        });
    }
};
