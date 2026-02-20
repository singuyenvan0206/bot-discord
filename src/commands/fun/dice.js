const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'dice',
    aliases: ['roll', 'd'],
    description: 'Đổ 2 xúc xắc và đặt cược vào kết quả!',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const user = db.getUser(message.author.id);
        const { parseAmount } = require('../../utils/economy');

        // Parse bet amount: $dice <bet> or $dice (default 50)
        let bet = args[0] ? parseAmount(args[0], user.balance) : 50;

        if (isNaN(bet) || bet <= 0) return message.reply(`${config.EMOJIS.ERROR} Số tiền cược không hợp lệ! Cách dùng: \`${config.PREFIX}dice <tiền_cược>\``);
        if (user.balance < bet) return message.reply(`${config.EMOJIS.ERROR} Không đủ tiền! Số dư: **${user.balance}** ${config.EMOJIS.COIN}`);
        if (bet > config.ECONOMY.MAX_BET) return message.reply(`${config.EMOJIS.ERROR} Mức cược tối đa là **${config.ECONOMY.MAX_BET.toLocaleString()}** coins!`);

        const uid = Date.now().toString(36);

        // Show betting options as buttons
        const embed = new EmbedBuilder()
            .setTitle(`${config.EMOJIS.GAMBLE}  Đổ Xúc Xắc (2d6)`)
            .setDescription(
                `**Mức cược:** ${bet} coins\n\n` +
                `Chọn dự đoán của bạn:\n` +
                `🔼 **Tài (Cao)** — Tổng từ 8-12 (x2 thưởng)\n` +
                `🔽 **Xỉu (Thấp)** — Tổng từ 2-6 (x2 thưởng)\n` +
                `🔢 **Lẻ** — Tổng là số lẻ (x2 thưởng)\n` +
                `#️⃣ **Chẵn** — Tổng là số chẵn (x2 thưởng)\n` +
                `${config.EMOJIS.LUCKY} **Số 7 May Mắn** — Tổng chính xác bằng 7 (x4 thưởng)`
            )
            .setColor(config.COLORS.INFO)
            .setFooter({ text: `Số dư: ${user.balance} coins` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dice_high_${uid}`).setLabel('Tài').setEmoji('🔼').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`dice_low_${uid}`).setLabel('Xỉu').setEmoji('🔽').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`dice_odd_${uid}`).setLabel('Lẻ').setEmoji('🔢').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`dice_even_${uid}`).setLabel('Chẵn').setEmoji('#️⃣').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`dice_7_${uid}`).setLabel('Số 7').setEmoji(config.EMOJIS.LUCKY).setStyle(ButtonStyle.Success),
        );

        const reply = await message.reply({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.customId.endsWith(uid) && i.user.id === message.author.id,
            time: 30000,
            max: 1,
        });

        collector.on('collect', async (i) => {
            const choice = i.customId.split('_')[1]; // high, low, odd, even, 7

            // Re-check balance at time of click
            const freshUser = db.getUser(message.author.id);
            if (freshUser.balance < bet) {
                return i.update({
                    embeds: [new EmbedBuilder().setTitle(`${config.EMOJIS.GAMBLE}  Đổ Xúc Xắc`).setDescription(`${config.EMOJIS.ERROR} Bạn không còn đủ tiền cược!`).setColor(config.COLORS.GAMBLE_LOSS)],
                    components: [],
                });
            }

            db.removeBalance(message.author.id, bet);

            // Roll 2d6
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const roll = d1 + d2;

            // Determine win
            let won = false;
            let winMultiplier = 2;
            const choiceLabel = { high: 'Tài (Cao) (8-12)', low: 'Xỉu (Thấp) (2-6)', odd: 'Số Lẻ', even: 'Số Chẵn', '7': 'Số 7 May Mắn' };

            if (choice === 'high' && roll > 7) won = true;
            else if (choice === 'low' && roll < 7) won = true;
            else if (choice === 'even' && roll % 2 === 0) won = true;
            else if (choice === 'odd' && roll % 2 !== 0) won = true;
            else if (choice === '7' && roll === 7) { won = true; winMultiplier = 4; }

            let prize = won ? bet * winMultiplier : 0;
            let bonusText = '';

            if (won) {
                const { getUserMultiplier } = require('../../utils/multiplier');
                const multiplier = getUserMultiplier(message.author.id, 'gamble');
                const bonus = Math.floor(bet * multiplier);
                prize += bonus;
                db.addBalance(message.author.id, prize);
                if (bonus > 0) bonusText = `\n✨ **Thưởng thêm:** +${bonus} coins (+${Math.round(multiplier * 100)}%)!`;
            }

            const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const resultEmbed = new EmbedBuilder()
                .setTitle(`${config.EMOJIS.GAMBLE}  Kết Quả Đổ Xúc Xắc`)
                .setDescription(
                    `**Dự đoán:** ${choiceLabel[choice]}\n` +
                    `**Tiền cược:** ${bet} coins\n\n` +
                    `${diceEmojis[d1] || '🎲'} **${d1}** + ${diceEmojis[d2] || '🎲'} **${d2}** = **${roll}**\n\n` +
                    (won
                        ? `🎉 **Bạn đã thắng ${prize} coins!** (x${winMultiplier} tiền cược)${bonusText}`
                        : `💸 **Bạn đã thua ${bet} coins!**`) +
                    `\n\n${config.EMOJIS.COIN} Số dư: **${db.getUser(message.author.id).balance}**`
                )
                .setColor(won ? config.COLORS.GAMBLE_WIN : config.COLORS.GAMBLE_LOSS);

            await i.update({ embeds: [resultEmbed], components: [] });
            startCooldown(message.client, 'dice', message.author.id);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle(`${config.EMOJIS.GAMBLE}  Đổ Xúc Xắc`)
                    .setDescription(`${config.EMOJIS.TIMER} Bạn đã quá thời gian chọn! Lượt chơi bị hủy.`)
                    .setColor(config.COLORS.NEUTRAL);
                reply.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => { });
            }
        });
    }
};
