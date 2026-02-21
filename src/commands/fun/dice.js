const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');
const { getUserMultiplier } = require('../../utils/multiplier');

module.exports = {
    name: 'dice',
    aliases: ['roll', 'di', 'd'],
    description: 'Đổ 2 xúc xắc và đặt cược vào kết quả!',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);

        // Parse bet amount: $dice <bet> or $dice (default 50)
        let bet = args[0] ? parseAmount(args[0], user.balance) : 50;

        if (isNaN(bet) || bet <= 0) return message.reply(`❌ ${t('common.invalid_amount', lang)}`);
        if (user.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: user.balance }));
        if (bet > config.ECONOMY.MAX_BET) return message.reply(t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() }));

        const uid = Date.now().toString(36);

        // Show betting options as buttons
        const embed = new EmbedBuilder()
            .setTitle(t('dice.title', lang))
            .setDescription(
                t('dice.bet_info', lang, { amount: bet }) +
                t('dice.high', lang) + '\n' +
                t('dice.low', lang) + '\n' +
                t('dice.odd', lang) + '\n' +
                t('dice.even', lang) + '\n' +
                t('dice.lucky_7', lang, { emoji: config.EMOJIS.LUCKY })
            )
            .setColor(config.COLORS.INFO)
            .setFooter({ text: t('dice.balance_footer', lang, { balance: user.balance }) });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dice_high_${uid}`).setLabel(t('dice.label_high', lang)).setEmoji('🔼').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`dice_low_${uid}`).setLabel(t('dice.label_low', lang)).setEmoji('🔽').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`dice_odd_${uid}`).setLabel(t('dice.label_odd', lang)).setEmoji('🔢').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`dice_even_${uid}`).setLabel(t('dice.label_even', lang)).setEmoji('#️⃣').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`dice_7_${uid}`).setLabel(t('dice.label_7', lang)).setEmoji(config.EMOJIS.LUCKY).setStyle(ButtonStyle.Success),
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
                    embeds: [new EmbedBuilder().setTitle(t('dice.menu_title', lang)).setDescription(t('dice.insufficient_bet', lang)).setColor(config.COLORS.GAMBLE_LOSS)],
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

            if (choice === 'high' && roll > 7) won = true;
            else if (choice === 'low' && roll < 7) won = true;
            else if (choice === 'even' && roll % 2 === 0) won = true;
            else if (choice === 'odd' && roll % 2 !== 0) won = true;
            else if (choice === '7' && roll === 7) { won = true; winMultiplier = 4; }

            let prize = won ? bet * winMultiplier : 0;
            let bonusText = '';

            if (won) {
                const multiplier = getUserMultiplier(message.author.id, 'gamble');
                const bonus = Math.floor(prize * multiplier);
                prize += bonus;
                db.addBalance(message.author.id, prize);
                if (bonus > 0) {
                    bonusText = t('slots.bonus_item', lang, { amount: bonus, percent: Math.round(multiplier * 100) });
                }
            }

            const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const labels = {
                'high': t('dice.label_high', lang) + ' (8-12)',
                'low': t('dice.label_low', lang) + ' (2-6)',
                'odd': t('dice.label_odd', lang),
                'even': t('dice.label_even', lang),
                '7': t('dice.label_7', lang)
            };

            const resultEmbed = new EmbedBuilder()
                .setTitle(t('dice.result_title', lang))
                .setDescription(
                    `**${t('dice.prediction', lang)}:** ${labels[choice]}\n` +
                    `**${t('rps.betting', lang, { amount: bet })}\n\n` +
                    `${diceEmojis[d1] || '🎲'} **${d1}** + ${diceEmojis[d2] || '🎲'} **${d2}** = **${roll}**\n\n` +
                    (won
                        ? t('dice.payout', lang, { amount: prize, multiplier: winMultiplier }) + bonusText
                        : t('dice.lose_msg', lang, { amount: bet }))
                )
                .setColor(won ? config.COLORS.GAMBLE_WIN : config.COLORS.GAMBLE_LOSS);

            await i.update({ embeds: [resultEmbed], components: [] });
            startCooldown(message.client, 'dice', message.author.id);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle(t('dice.menu_title', lang))
                    .setDescription(t('dice.timeout', lang))
                    .setColor(config.COLORS.NEUTRAL);
                reply.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => { });
            }
        });
    }
};
