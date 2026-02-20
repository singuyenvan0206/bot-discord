const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

const categories = {
    fun: {
        label: 'Trò chơi & Giải trí',
        description: 'Các trò chơi nhỏ và hoạt động vui nhộn',
        emoji: '🎮',
        commands: [
            '`$coinflip` (`$cf`, `$flip`) — Tung đồng xu',
            '`$dice` (`$roll`) — Đổ xúc xắc',
            '`$rps` (`$rock`) — Kéo Búa Bao',
            '`$blackjack` (`$bj`) — Chơi Blackjack',
            '`$slots` — Quay hũ Slots',
            '`$tictactoe` (`$ttt`) — Chơi Cờ ca-rô (3x3)',
            '`$connect4` (`$c4`) — Chơi Connect 4',
            '`$memory` (`$mem`, `$match`) — Trò chơi lật thẻ bài',
            '`$trivia` — Trắc nghiệm kiến thức',
            '`$emojiquiz` (`$quiz`) — Đoán phim/cụm từ qua Emoji',
            '`$poker` (`$pk`) — Multiplayer High Card Poker',
            '`$minesweeper` (`$mine`, `$ms`) — Dò mìn (Cổ điển)',
            '`$hangman` (`$hang`, `$hm`) — Trò chơi Người treo cổ',
            '`$wordchain` (`$wc`) — Trò chơi nối chữ',
            '`$scramble` (`$scram`) — Giải mã từ xáo trộn',
            '`$guess` (`$gn`) — Đoán số',
            '`$reaction` (`$react`) — Thử thách phản xạ',
        ]
    },
    economy: {
        label: 'Kinh tế',
        description: 'Tiền bạc, công việc và giao dịch',
        emoji: '💰',
        commands: [
            '`$balance` (`$bal`, `$bl`) — Kiểm tra ví và ngân hàng',
            '`$daily` (`$d`, `$dy`) — Nhận thưởng hàng ngày',
            '`$work` (`$w`, `$wk`) — Làm việc kiếm tiền',
            '`$shop` (`$sh`, `$store`) — Cửa hàng vật phẩm',
            '`$buy` (`$b`) <id> — Mua vật phẩm',
            '`$sell` (`$s`) <id> [amount] — Bán vật phẩm (Hoàn tiền 70%)',
            '`$inventory` (`$inv`) — Xem túi đồ của bạn',
            '`$transfer` (`$pay`, `$tf`) <user> <amount> — Chuyển tiền',
            '`$leaderboard` (`$lb`, `$top`) — Bảng xếp hạng đại gia',
            '`$fish` (`$fishing`, `$cast`) — Câu cá đổi lấy tiền!',
        ]
    },
    utility: {
        label: 'Tiện ích',
        description: 'Công cụ hữu ích',
        emoji: '🔧',
        commands: [
            '`$ping` (`$p`) — Kiểm tra độ trễ bot',
            '`$serverinfo` — Xem thông tin máy chủ',
            '`$userinfo` (`$user`, `$ui`) [user] — Xem chi tiết người dùng',
            '`$avatar` (`$av`) [user] — Xem ảnh đại diện',
            '`$profile` — Hồ sơ cá nhân toàn diện',
        ]
    },
    giveaway: {
        label: 'Sự kiện Quà tặng',
        description: 'Tổ chức và quản lý Giveaway',
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

const COMMAND_GUIDES = {
    // --- Fun & Games ---
    'trivia': {
        usage: '',
        guide: '🌟 **Mô tả:** Thử thách kiến thức của bạn với kho câu hỏi trắc nghiệm khổng lồ!\n\n🕹️ **Cách chơi:**\n1. Sử dụng lệnh để nhận câu hỏi.\n2. Bạn có **15 giây** để trả lời.\n3. Nhấn vào nút (A, B, C, D) tương ứng với đáp án đúng.\n\n💰 **Phần thưởng:** Trả lời đúng sẽ nhận ngay tiền mặt!'
    },
    'hangman': {
        usage: '',
        guide: '🌟 **Mô tả:** Đoán từ ẩn bằng cách tìm từng chữ cái trước khi hết mạng!\n\n🕹️ **Cách chơi:**\n- Bot sẽ chọn một từ ngẫu nhiên.\n- Bạn có **6 mạng** (❤️).\n- Nhắn một chữ cái để đoán (vđ: "a").\n- Nhắn cả từ để giải mã ngay lập tức.\n- Có gợi ý (Hint) dựa trên định nghĩa từ điển.\n\n💰 **Phần thưởng:** Thắng nhận **50 coins**.'
    },
    'scramble': {
        usage: '',
        guide: '🌟 **Mô tả:** Sắp xếp lại các chữ cái bị xáo trộn để tìm từ đúng.\n\n🕹️ **Cách chơi:**\n- Một từ bị xáo trộn sẽ hiện ra (vđ: "elppa" -> "apple").\n- Có gợi ý về định nghĩa hoặc chữ cái bắt đầu.\n- Bạn có **30 giây** để nhắn đáp án đúng vào kênh.\n\n💰 **Phần thưởng:** Người đầu tiên giải đúng nhận **50 coins**.'
    },
    'connect4': {
        usage: '@opponent [bet]',
        guide: '🌟 **Mô tả:** Trò chơi chiến thuật kinh điển! Xếp 4 quân cờ cùng màu thành hàng ngang, dọc hoặc chéo.\n\n🕹️ **Cách chơi:**\n1. Thách đấu: `$connect4 @user 100` (tiền cược tùy chọn).\n2. Đối thủ phải nhấn nút đồng ý.\n3. Nhấn số cột (1-7) để thả quân cờ.\n\n⚖️ **Quy tắc:**\n- Hai bên thay phiên nhau (🔴 và 🟡).\n- Hòa nếu bảng đầy.\n\n💰 **Phần thưởng:** Người thắng nhận toàn bộ tiền cược!'
    },
    'memory': {
        usage: '',
        guide: '🌟 **Mô tả:** Kiểm tra trí nhớ bằng cách tìm các cặp emoji giống nhau.\n\n🕹️ **Cách chơi:**\n1. Một bảng 4x4 nút sẽ hiện ra.\n2. Nhấn một nút để lật emoji.\n3. Nhấn nút khác để tìm cặp tương ứng.\n\n🎯 **Mục tiêu:** Tìm đủ **8 cặp** với số lần thử ít nhất!\n\n💰 **Phần thưởng:**\n- Thưởng cơ bản: **100 coins**.\n- Bonus tốc độ: Thêm coins nếu hoàn thành dưới 30s/60s.'
    },
    'minesweeper': {
        usage: '[bet]',
        guide: '🌟 **Mô tả:** Dò mìn phiên bản hiện đại! Mở ô an toàn để tăng hệ số thưởng.\n\n🕹️ **Cách chơi:**\n- Bảng 5x5 với **5 quả mìn** ẩn giấu.\n- Nhấn ô ⬜ để mở.\n- **Ô an toàn (💎):** Hiện số mìn xung quanh. Hệ số thưởng tăng lên!\n- **Mìn (💣):** Thua cuộc và mất tiền cược.\n- **Rút tiền (Cashout):** Dừng lại bất cứ lúc nào để nhận thưởng hiện tại.\n\n🛡️ **Mẹo:** Sở hữu **Shield** trong kho đồ sẽ giúp bạn bảo toàn 50% tiền cược nếu dẫm phải mìn!'
    },
    'wordchain': {
        usage: '',
        guide: '🌟 **Mô tả:** Trò chơi nối chữ nhiều người chơi.\n\n🕹️ **Cách chơi:**\n1. Bot đưa ra từ bắt đầu.\n2. Bạn phải nhắn từ **bắt đầu bằng chữ cái cuối cùng** của từ trước đó.\n3. Ví dụ: `Fish` -> `Hat` -> `Tiger`.\n\n⚖️ **Quy tắc:**\n- Phải là từ tiếng Anh hợp lệ.\n- Không được lặp lại từ đã dùng.\n- Không được tự nối chữ của chính mình.\n\n💰 **Phần thưởng:** Mỗi từ đúng cộng thêm coins!'
    },
    'blackjack': {
        usage: '[bet]',
        guide: '🌟 **Mô tả:** Đánh bài Blackjack với nhà cái! Tổng điểm càng gần 21 càng tốt.\n\n🕹️ **Cách chơi:**\n- **Hit:** Rút thêm bài.\n- **Stand:** Dừng rút và so điểm.\n\n⚖️ **Giá trị:**\n- 2-10: Theo số trên bài.\n- J, Q, K: 10 điểm.\n- Ace (A): 1 hoặc 11 điểm tùy tình huống.\n\n💰 **Thưởng:** Thắng nhận x2 tiền cược. Blackjack tự nhiên (A + 10đ) nhận x2.5!'
    },
    'slots': {
        usage: '[bet]',
        guide: '🌟 **Mô tả:** Thử vận may với máy quay hũ!\n\n🕹️ **Cách chơi:**\n- Đặt cược và quay.\n- Khớp 3 biểu tượng ở hàng giữa để thắng lớn.\n\n💰 **Bảng thưởng:**\n7️⃣7️⃣7️⃣ : **x100 JACKPOT!**\n💎💎💎 : x50\n⭐ : x25\n...và nhiều biểu tượng khác.'
    },
    'fish': {
        usage: '',
        guide: '🌟 **Mô tả:** Đi câu cá để kiếm tiền!\n\n🎣 **Yêu cầu:**\n1. **Rod:** Cần câu (Bamboo, Fiberglass, hoặc Carbon Fiber).\n2. **Bait:** Mồi (Worm, Cricket, hoặc Squid).\n\n🕹️ **Cách chơi:**\n- Mua Cần và Mồi trong `$shop`.\n- Dùng lệnh `$fish`. Bot sẽ tự dùng Cần và Mồi tốt nhất bạn có.\n- Mỗi lần câu tốn 1 Mồi.\n\n✨ **Cơ chế:** Cần và Mồi càng xịn, Luck càng cao, càng dễ bắt được cá hiếm (Cá mập, Kraken) với giá cực cao!'
    },
    'profile': {
        usage: '[user]',
        guide: '🌟 **Mô tả:** Xem hồ sơ chi tiết của bạn hoặc người khác.\n\n📊 **Thông tin hiển thị:**\n- **Economy:** Số dư ví và **Net Worth** (Tổng tài sản bao gồm cả giá trị vật phẩm).\n- **Ranking:** Thứ hạng giàu có của bạn trong Top 100 toàn cầu.\n- **Collection:** Tổng số vật phẩm và số loại vật phẩm unique đang sở hữu.'
    },
    'leaderboard': {
        usage: '',
        guide: '🌟 **Mô tả:** Bảng xếp hạng những người giàu nhất máy chủ.\n\n🏆 **Cơ chế:**\n- Xếp hạng dựa trên **Net Worth** (Ví + Kho đồ).\n- Top 3 người đứng đầu sẽ có huy hiệu đặc biệt: 🥇, 🥈, 🥉.'
    }
};

module.exports = {
    name: 'help',
    description: 'Shows a list of all available commands',
    async execute(message, args) {
        const prefix = config.PREFIX;

        // 1. Check if user wants specific command help
        if (args.length > 0) {
            const name = args[0].toLowerCase();
            const command = message.client.commands.get(name) ||
                message.client.commands.find(c => c.aliases && c.aliases.includes(name));

            if (!command) {
                return message.reply(`${config.EMOJIS.ERROR} Could not find command **${name}**!`);
            }

            const guideInfo = COMMAND_GUIDES[command.name] || {};
            const usage = guideInfo.usage || command.usage || '';
            const guide = (guideInfo.guide || command.description || 'No detailed guide available.').replace(/\$/g, prefix);

            const embed = new EmbedBuilder()
                .setTitle(`📖 Lệnh: ${prefix}${command.name}`)
                .setDescription(command.description || 'Không có mô tả')
                .setColor(config.COLORS.INFO)
                .addFields(
                    { name: '📝 Tên viết tắt', value: command.aliases ? command.aliases.map(a => `\`${prefix}${a}\``).join(', ') : 'Không có', inline: true },
                    { name: '⏱️ Thời gian chờ', value: `${command.cooldown || 3} giây`, inline: true },
                    { name: '💡 Cách dùng', value: `\`${prefix}${command.name} ${usage}\``.trim(), inline: true },
                    { name: '🔍 Hướng dẫn chi tiết', value: guide, inline: false }
                )
                .setFooter({ text: `Nhập ${prefix}help để xem tất cả danh mục` });

            return message.reply({ embeds: [embed] });
        }

        // 2. Default Behavior: Show Category Menu
        const generateHomeEmbed = () => new EmbedBuilder()
            .setTitle(`${config.EMOJIS.SUCCESS}  Menu Hướng dẫn Bot`)
            .setDescription(`Chọn một danh mục từ menu thả xuống bên dưới để xem các lệnh có sẵn.\n\n💡 **Mẹo:** Nhập \`${prefix}help <tên_lệnh>\` để xem hướng dẫn chi tiết của lệnh đó!`)
            .setColor(config.COLORS.INFO)
            .addFields({ name: '🔗 Liên kết', value: '[Máy chủ hỗ trợ](https://discord.gg/) • [Mời Bot](https://discord.com/oauth2/authorize?client_id=' + message.client.user.id + '&permissions=8&scope=bot%20applications.commands)' })
            .setThumbnail(message.client.user.displayAvatarURL())
            .setFooter({ text: `Tất cả các lệnh đều sử dụng tiền tố "${prefix}"` });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Chọn một danh mục...')
            .addOptions([
                {
                    label: 'Trang chủ',
                    description: 'Quay lại menu chính',
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
            componentType: ComponentType.StringSelect,
            time: 120000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            const selection = i.values[0];

            if (selection === 'home') {
                return await i.update({ embeds: [generateHomeEmbed()], components: [row] });
            }

            const category = categories[selection];
            const categoryEmbed = new EmbedBuilder()
                .setTitle(`${category.emoji}  Lệnh: ${category.label}`)
                .setDescription(category.commands.join('\n').replace(/\$/g, prefix))
                .setColor(config.COLORS.INFO)
                .setFooter({ text: 'Chọn "Trang chủ" để quay lại hoặc chọn danh mục khác' });

            await i.update({ embeds: [categoryEmbed], components: [row] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true).setPlaceholder('Phiên làm việc đã hết hạn')
            );
            response.edit({ components: [disabledRow] }).catch(() => { });
        });
    }
};
