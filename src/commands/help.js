
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../config');
const { t, getLanguage } = require('../utils/i18n');

module.exports = {
    name: 'help',
    aliases: ['h'],
    description: 'Hiển thị danh sách lệnh',
    async execute(message, args) {
        const prefix = config.PREFIX;
        const lang = getLanguage(message.author.id, message.guild?.id);

        const categories = {
            fun: {
                label: t('help.categories.fun.label', lang),
                description: t('help.categories.fun.description', lang),
                emoji: '🎮',
                commands: [
                    '`$coinflip` (`$cf`, `$flip`) — ' + (lang === 'vi' ? 'Tung đồng xu' : 'Flip a coin'),
                    '`$dice` (`$roll`) — ' + (lang === 'vi' ? 'Đổ xúc xắc' : 'Roll dice'),
                    '`$rps` (`$rock`) — ' + (lang === 'vi' ? 'Kéo Búa Bao' : 'Rock Paper Scissors'),
                    '`$blackjack` (`$bj`) — ' + (lang === 'vi' ? 'Chơi Blackjack' : 'Play Blackjack'),
                    '`$slots` — ' + (lang === 'vi' ? 'Quay hũ Slots' : 'Spin Slots'),
                    '`$tictactoe` (`$ttt`) — ' + (lang === 'vi' ? 'Chơi Cờ ca-rô (3x3)' : 'Tic Tac Toe (3x3)'),
                    '`$connect4` (`$c4`) — ' + (lang === 'vi' ? 'Chơi Connect 4' : 'Play Connect 4'),
                    '`$memory` (`$mem`, `$match`) — ' + (lang === 'vi' ? 'Trò chơi lật thẻ bài' : 'Memory card game'),
                    '`$trivia` — ' + (lang === 'vi' ? 'Trắc nghiệm kiến thức' : 'Trivia quiz'),
                    '`$emojiquiz` (`$quiz`) — ' + (lang === 'vi' ? 'Đoán phim/cụm từ qua Emoji' : 'Guess movie/phrase via Emoji'),
                    '`$poker` (`$pk`) — ' + (lang === 'vi' ? 'Multiplayer High Card Poker' : 'Multiplayer High Card Poker'),
                    '`$minesweeper` (`$mine`, `$ms`) — ' + (lang === 'vi' ? 'Dò mìn (Cổ điển)' : 'Minesweeper (Classic)'),
                    '`$hangman` (`$hang`, `$hm`) — ' + (lang === 'vi' ? 'Trò chơi Người treo cổ' : 'Hangman game'),
                    '`$wordchain` (`$wc`) — ' + (lang === 'vi' ? 'Trò chơi nối chữ' : 'Word chain game'),
                    '`$scramble` (`$scram`) — ' + (lang === 'vi' ? 'Giải mã từ xáo trộn' : 'Unscramble words'),
                    '`$guess` (`$gn`) — ' + (lang === 'vi' ? 'Đoán số' : 'Guess number'),
                    '`$reaction` (`$react`) — ' + (lang === 'vi' ? 'Thử thách phản xạ' : 'Reaction challenge'),
                ]
            },
            economy: {
                label: t('help.categories.economy.label', lang),
                description: t('help.categories.economy.description', lang),
                emoji: '💰',
                commands: [
                    '`$balance` (`$bal`, `$bl`) — ' + (lang === 'vi' ? 'Kiểm tra ví và ngân hàng' : 'Check wallet and bank'),
                    '`$daily` (`$d`, `$dy`) — ' + (lang === 'vi' ? 'Nhận thưởng hàng ngày' : 'Claim daily reward'),
                    '`$work` (`$w`, `$wk`) — ' + (lang === 'vi' ? 'Làm việc kiếm tiền' : 'Work to earn money'),
                    '`$shop` (`$sh`, `$store`) — ' + (lang === 'vi' ? 'Cửa hàng vật phẩm' : 'Item shop'),
                    '`$buy` (`$b`) <id> — ' + (lang === 'vi' ? 'Mua vật phẩm' : 'Buy an item'),
                    '`$sell` (`$s`) <id> [amount] — ' + (lang === 'vi' ? 'Bán vật phẩm (Hoàn tiền 70%)' : 'Sell items (70% refund)'),
                    '`$inventory` (`$inv`) — ' + (lang === 'vi' ? 'Xem túi đồ của bạn' : 'View your inventory'),
                    '`$transfer` (`$pay`, `$tf`) <user> <amount> — ' + (lang === 'vi' ? 'Chuyển tiền' : 'Transfer money'),
                    '`$leaderboard` (`$lb`, `$top`) — ' + (lang === 'vi' ? 'Bảng xếp hạng đại gia' : 'Rich leaderboard'),
                    '`$fish` (`$fishing`, `$cast`) — ' + (lang === 'vi' ? 'Câu cá đổi lấy tiền!' : 'Go fishing for money!'),
                ]
            },
            utility: {
                label: t('help.categories.utility.label', lang),
                description: t('help.categories.utility.description', lang),
                emoji: '🔧',
                commands: [
                    '`$ping` (`$p`) — ' + (lang === 'vi' ? 'Kiểm tra độ trễ bot' : 'Check bot latency'),
                    '`$serverinfo` — ' + (lang === 'vi' ? 'Xem thông tin máy chủ' : 'View server information'),
                    '`$userinfo` (`$user`, `$ui`) [user] — ' + (lang === 'vi' ? 'Xem chi tiết người dùng' : 'View user details'),
                    '`$avatar` (`$av`) [user] — ' + (lang === 'vi' ? 'Xem ảnh đại diện' : 'View avatar'),
                    '`$profile` — ' + (lang === 'vi' ? 'Hồ sơ cá nhân toàn diện' : 'Comprehensive personal profile'),
                    '`$language` (`$lang`) — ' + (lang === 'vi' ? 'Thiết lập ngôn ngữ' : 'Set language preferences'),
                ]
            },
            giveaway: {
                label: t('help.categories.giveaway.label', lang),
                description: t('help.categories.giveaway.description', lang),
                emoji: '🎉',
                commands: [
                    '`$giveaway` (`$g`) start <time> <winners> <prize>',
                    '`$giveaway` (`$g`) end <message_id>',
                    '`$giveaway` (`$g`) reroll <message_id>',
                    '`$giveaway` (`$g`) list',
                    '`$giveaway` (`$g`) pause <message_id>',
                    '`$giveaway` (`$g`) resume <message_id>',
                    '`$giveaway` (`$g`) delete <message_id>',
                ]
            }
        };

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
            .setTitle(t('help.menu_title', lang, { emoji: config.EMOJIS.SUCCESS }))
            .setDescription(t('help.menu_desc', lang, { prefix }))
            .setColor(config.COLORS.INFO)
            .addFields({ name: '🔗 ' + (lang === 'vi' ? 'Liên kết' : 'Links'), value: `[${lang === 'vi' ? 'Máy chủ hỗ trợ' : 'Support Server'}](https://discord.gg/) • [${lang === 'vi' ? 'Mời Bot' : 'Invite Bot'}](https://discord.com/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands)` })
            .setThumbnail(message.client.user.displayAvatarURL())
            .setFooter({ text: t('help.footer_home', lang, { prefix }) });

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
                .setTitle(`${category.emoji}  ${category.label}`)
                .setDescription(category.commands.join('\n').replace(/\$/g, prefix))
                .setColor(config.COLORS.INFO)
                .setFooter({ text: t('help.footer_category', lang) });

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
