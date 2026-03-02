const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount, addHouseProfit, getMaxBet } = require('../../utils/economy');
const { getUserMultiplier, calculateReward } = require('../../utils/multiplier');
const { addXp, XP_AMOUNTS } = require('../../utils/leveling');

module.exports = {
    name: 'dice',
    aliases: ['roll', 'di', 'd'],
    description: 'Đổ xúc xắc đặt cược (Roll dice to gamble)',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);

        // Parse bet amount: $dice <bet> or $dice (default 50)
        const maxBet = await getMaxBet(message.author.id);
        let bet = args[0] ? parseAmount(args[0], user.balance, maxBet) : 50;

        if (isNaN(bet) || bet <= 0) return message.reply(`❌ ${t('common.invalid_amount', lang)}`);
        if (bet && user.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: user.balance.toLocaleString() }));
        if (bet > maxBet) return message.reply(t('common.max_bet_error', lang, { limit: maxBet.toLocaleString() }));

        const uid = Date.now().toString(36);

        // Show betting options as buttons
        const embed = new EmbedBuilder()
            .setTitle(t('dice.title', lang))
            .setDescription(
                t('dice.bet_info', lang, { amount: bet.toLocaleString() }) +
                t('dice.high', lang) + '\n' +
                t('dice.low', lang) + '\n' +
                t('dice.odd', lang) + '\n' +
                t('dice.even', lang) + '\n' +
                t('dice.lucky_7', lang, { emoji: config.EMOJIS.LUCKY })
            )
            .setColor(config.COLORS.INFO)
            .setFooter({ text: t('dice.balance_footer', lang, { balance: user.balance.toLocaleString() }) });

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
            const freshUser = await db.getUser(message.author.id, i.guild.id);
            if (freshUser.balance < bet) {
                return i.update({
                    embeds: [new EmbedBuilder().setTitle(t('dice.menu_title', lang)).setDescription(t('dice.insufficient_bet', lang)).setColor(config.COLORS.GAMBLE_LOSS)],
                    components: [],
                });
            }

            await db.removeBalance(i.guild.id, message.author.id, bet);

            // Grant Action XP
            await addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, i.guild.id);

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
                // Calculate reward including bonuses (Profit = prize - bet)
                const profit = prize - bet;
                const { calculateReward } = require('../../utils/multiplier');
                const { total, bonus, percent } = await calculateReward(profit, message.member, 'gamble');

                const payout = total + bet;
                await db.addBalance(i.guild.id, message.author.id, payout);

                // Grant Win XP
                const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                await addXp(message.member, winXp, i.guild.id);

                bonusText = t('dice.win_msg', lang, {
                    amount: payout.toLocaleString(),
                    emoji: config.EMOJIS.COIN,
                    multiplier: winMultiplier
                });
                if (bonus > 0) {
                    bonusText += `\n✨ **Bonus:** +${percent}% (${bonus.toLocaleString()} ${config.EMOJIS.COIN})`;
                }

                // Musician Interaction: Flow State (10% chance to double final win)
                const u = await db.getUser(message.author.id, i.guild.id);
                if (u.job === 'musician' && Math.random() < 0.10) {
                    prize *= 2;
                    await db.addBalance(i.guild.id, message.author.id, prize / 2); // Add the extra half
                    bonusText += t('common.flow_state', lang);
                }
            }

            let lossMsgResult = '';
            if (!won) {
                await addHouseProfit(i, bet);
                lossMsgResult = t('dice.lose_msg', lang, { amount: bet.toLocaleString() });
                // Trader Interaction: Market Tip (15% chance to refund 50% on loss)
                const u = await db.getUser(message.author.id, i.guild.id);
                if (u.job === 'trader' && Math.random() < 0.15) {
                    const refund = Math.floor(bet * 0.5);
                    await db.addBalance(i.guild.id, message.author.id, refund);
                    lossMsgResult += t('common.market_tip', lang);
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
                    `**${t('rps.betting', lang, { amount: bet.toLocaleString() })}\n\n` +
                    `${diceEmojis[d1] || '🎲'} **${d1}** + ${diceEmojis[d2] || '🎲'} **${d2}** = **${roll}**\n\n` +
                    (won ? bonusText : lossMsgResult)
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
