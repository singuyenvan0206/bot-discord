
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../config');
const { t, getLanguage } = require('../utils/i18n');
const db = require('../database');

module.exports = {
    name: 'help',
    aliases: ['h'],
    description: 'Hiển thị danh sách lệnh',
    async execute(message, args) {
        const prefix = config.PREFIX;
        const lang = getLanguage(message.author.id, message.guild?.id);
        const isOwner = db.isOwner(message.author.id);

        const categories = {
            fun: {
                label: t('help.categories.fun.label', lang),
                description: t('help.categories.fun.description', lang),
                emoji: '🎮',
                commands: [
                    '`$coinflip` (`$cf`, `$flip`)',
                    '`$dice` (`$roll`)',
                    '`$rps` (`$rock`)',
                    '`$blackjack` (`$bj`)',
                    '`$slots`',
                    '`$poker` (`$pk`)',
                    '`$tictactoe` (`$ttt`)',
                    '`$connect4` (`$c4`)',
                    '`$memory` (`$mem`, `$match`)',
                    '`$minesweeper` (`$mine`, `$ms`)',
                    '`$trivia`',
                    '`$emojiquiz` (`$eq`, `$quiz`)',
                    '`$hangman` (`$hang`, `$hm`)',
                    '`$wordchain` (`$wc`)',
                    '`$scramble` (`$scram`)',
                    '`$guess` (`$gn`)',
                    '`$reaction` (`$react`)',
                ]
            },
            economy: {
                label: t('help.categories.economy.label', lang),
                description: t('help.categories.economy.description', lang),
                emoji: '💰',
                commands: [
                    '`$balance` (`$bal`, `$bl`)',
                    '`$daily` (`$d`, `$dy`)',
                    '`$work` (`$w`, `$wk`)',
                    '`$job` (`$j`)',
                    '`$fish` (`$fishing`, `$cast`)',
                    '`$shop` (`$sh`, `$store`)',
                    '`$inventory` (`$inv`)',
                    '`$buy` (`$b`)',
                    '`$sell` (`$s`)',
                    '`$use` <id>',
                    '`$transfer` (`$pay`, `$tf`)',
                    '`$leaderboard` (`$lb`, `$top`)',
                ]
            },
            utility: {
                label: t('help.categories.utility.label', lang),
                description: t('help.categories.utility.description', lang),
                emoji: '🔧',
                commands: [
                    '`$ping` (`$p`)',
                    '`$profile` (`$pf`)',
                    '`$userinfo` (`$ui`)',
                    '`$serverinfo` (`$si`)',
                    '`$avatar` (`$av`)',
                    '`$language` (`$lang`)',
                ]
            },
            giveaway: {
                label: t('help.categories.giveaway.label', lang),
                description: t('help.categories.giveaway.description', lang),
                emoji: '🎉',
                commands: [
                    '`$giveaway start`',
                    '`$giveaway end`',
                    '`$giveaway reroll`',
                    '`$giveaway list`',
                    '`$giveaway pause`',
                    '`$giveaway resume`',
                    '`$giveaway delete`',
                ]
            }
        };

        if (isOwner) {
            categories.owner = {
                label: t('help.categories.owner.label', lang),
                description: t('help.categories.owner.description', lang),
                emoji: '👑',
                commands: [
                    '`$addmoney` (`$am`)',
                    '`$removemoney` (`$rm`)',
                    '`$additem` (`$ai`)',
                    '`$removeitem` (`$ri`)',
                    '`$setlevel`',
                    '`$resetuser`',
                    '`$serverlist`',
                    '`$leaveserver`',
                    '`$setstatus`',
                    '`$shutdown`',
                ]
            };
        }

        // 1. Check if user wants specific command help
        if (args.length > 0) {
            const name = args[0].toLowerCase();
            const command = message.client.commands.get(name) ||
                message.client.commands.find(c => c.aliases && c.aliases.includes(name));

            if (!command) {
                return message.reply(`❌ Could not find command ** ${name}** !`);
            }

            const guide = t(`help.guides.${command.name} `, lang).replace(/\$/g, prefix);
            const usage = command.usage || '';

            const embed = new EmbedBuilder()
                .setTitle(t('help.title', lang, { emoji: '📖', prefix, name: command.name }))
                .setDescription(command.description || t('help.no_description', lang))
                .setColor(config.COLORS.INFO)
                .addFields(
                    { name: `📝 ${t('help.aliases', lang)} `, value: command.aliases ? command.aliases.map(a => `\`${prefix}${a}\``).join(', ') : t('help.none', lang), inline: true },
                    { name: `⏱️ ${t('help.cooldown', lang)}`, value: `${command.cooldown || 3}s`, inline: true },
                    { name: `💡 ${t('help.usage_title', lang)}`, value: `\`${prefix}${command.name} ${usage}\``.trim(), inline: true },
                    { name: `🔍 ${t('help.guide_title', lang)}`, value: guide.startsWith('help.guides') ? t('help.no_guide', lang) : guide, inline: false }
                )
                .setFooter({ text: t('help.footer_all', lang, { prefix }) });

            return message.reply({ embeds: [embed] });
        }

        // 2. Default Behavior: Show Category Menu
        const generateHomeEmbed = () => new EmbedBuilder()
            .setTitle(`${config.EMOJIS.SUCCESS}  ${t('help.menu_title', lang)}`)
            .setDescription(`${t('help.menu_desc', lang, { prefix })}\n\n**🚀 ${lang === 'vi' ? 'Thống kê Bot' : 'Bot Stats'}:**\n` +
                `> 📋 **${lang === 'vi' ? 'Lệnh' : 'Commands'}:** ${message.client.commands.size}\n` +
                `> 🌐 **${lang === 'vi' ? 'Máy chủ' : 'Servers'}:** ${message.client.guilds.cache.size}\n` +
                `> 👥 **${lang === 'vi' ? 'Người dùng' : 'Users'}:** ${message.client.users.cache.size}`)
            .setColor(config.COLORS.INFO)
            .addFields(
                { name: '🔗 ' + (lang === 'vi' ? 'Liên kết nhanh' : 'Quick Links'), value: `[${lang === 'vi' ? 'Máy chủ hỗ trợ' : 'Support Server'}](https://discord.gg/) • [${lang === 'vi' ? 'Mời Bot' : 'Invite Bot'}](https://discord.com/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands)`, inline: false }
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
