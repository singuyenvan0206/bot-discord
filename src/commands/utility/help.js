const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const { formatDuration } = require('../../utils/time');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    aliases: ['h'],
    description: 'Mở menu trợ giúp hệ thống và hướng dẫn lệnh (Open the system help menu and command guides)',
    skipXp: true,
    async execute(message, args) {
        const prefix = config.PREFIX;
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const isOwner = await db.isOwner(message.author.id);
        const isAdmin = isOwner || (message.member && message.member.permissions.has('Administrator')) || (message.guild && message.guild.ownerId === message.author.id);

        // 1. Dynamic Command Discovery
        const categories = {
            earning: { label: t('help.categories.earning.label', lang), description: t('help.categories.earning.description', lang), emoji: '💼', commands: [] },
            finance: { label: t('help.categories.finance.label', lang), description: t('help.categories.finance.description', lang), emoji: '🏦', commands: [] },
            assets: { label: t('help.categories.assets.label', lang), description: t('help.categories.assets.description', lang), emoji: '🏙️', commands: [] },
            gambling: { label: t('help.categories.gambling.label', lang), description: t('help.categories.gambling.description', lang), emoji: '🎰', commands: [] },
            minigames: { label: t('help.categories.minigames.label', lang), description: t('help.categories.minigames.description', lang), emoji: '🎮', commands: [] },
            social: { label: t('help.categories.social.label', lang), description: t('help.categories.social.description', lang), emoji: '💍', commands: [] },
            utility: { label: t('help.categories.utility.label', lang), description: t('help.categories.utility.description', lang), emoji: '🔧', commands: [] },
            giveaway: { label: t('help.categories.giveaway.label', lang), description: t('help.categories.giveaway.description', lang), emoji: '🎉', commands: [] }
        };

        if (isAdmin) {
            categories.admin = { label: t('help.categories.admin.label', lang), description: t('help.categories.admin.description', lang), emoji: '⚙️', commands: [] };
        }

        if (isOwner) {
            categories.owner = { label: t('help.categories.owner.label', lang), description: t('help.categories.owner.description', lang), emoji: '👑', commands: [] };
        }

        // Map commands to categories based on their folder
        const commandsPath = path.join(__dirname, '..');
        const loadCommandsRecursive = (dir, topLevelFolder) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.lstatSync(filePath);

                if (stat.isDirectory()) {
                    loadCommandsRecursive(filePath, topLevelFolder || file);
                } else if (file.endsWith('.js')) {
                    const categoryFolder = topLevelFolder || path.basename(dir);
                    if (!categories[categoryFolder]) continue;
                    if (categoryFolder === 'owner' && !isOwner) continue;

                    const command = require(filePath);
                    const transKey = `help.descriptions.${command.name}`;
                    let description = t(transKey, lang);

                    if (description === transKey) {
                        description = command.description || t('help.no_description', lang);
                    }

                    let cmdStr = `\`${prefix}${command.name}\` - ${description}`;
                    if (command.aliases && command.aliases.length > 0) {
                        cmdStr = `\`${prefix}${command.name}\` (\`${command.aliases.map(a => `${prefix}${a}`).join('`, `')}\`) - ${description}`;
                    }

                    if (command.subcommands) {
                        const subList = Object.keys(command.subcommands).map(s => `  ┗ \`${prefix}${command.name} ${s.split(' ')[0]}\``).join('\n');
                        cmdStr += `\n${subList}`;
                    }

                    categories[categoryFolder].commands.push(cmdStr);
                }
            }
        };

        loadCommandsRecursive(commandsPath);

        // 2. Specific Command Help
        if (args.length > 0) {
            const name = args[0].toLowerCase();
            const command = message.client.commands.get(name) ||
                message.client.commands.find(c => c.aliases && c.aliases.includes(name));

            if (!command) {
                return message.reply(`❌ ${t('help.command_not_found', lang, { name })}`);
            }

            const guide = t(`help.guides.${command.name}`, lang).replace(/\$/g, prefix);
            const usage = command.usage || '';
            const transKey = `help.descriptions.${command.name}`;
            let description = t(transKey, lang);

            if (description === transKey) {
                description = command.description || t('help.no_description', lang);
            }

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
            .setFooter({ text: t('help.footer_home', lang, { prefix }), iconURL: message.author.displayAvatarURL({ dynamic: true, size: 256 }) })
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
                .setAuthor({ name: `${category.label}`, iconURL: message.client.user.displayAvatarURL({ dynamic: true, size: 256 }) })
                .setTitle(`${category.emoji}  ${category.label}`)
                .setDescription(`*${category.description}*\n\n${category.commands.join('\n').replace(/\$/g, prefix)}`)
                .setColor(config.COLORS.INFO)
                .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
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
