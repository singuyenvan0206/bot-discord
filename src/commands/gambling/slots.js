const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const { calculateReward } = require('../../utils/multiplier');
const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
const { parseAmount, addHouseProfit, getMaxBet } = require('../../utils/economy');

module.exports = {
    name: 'slots',
    aliases: ['slot', 'slt'],
    description: 'Quay hũ (Play Slot Machine)',
    cooldown: 5,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const user = await db.getUser(message.author.id, message.guild.id);
        const maxBetLimit = await getMaxBet(message.author.id);
        let bet = args[0] ? parseAmount(args[0], user.balance, maxBetLimit) : 50;

        if (args[0] && (isNaN(bet) || bet <= 0)) return message.reply(t('common.invalid_amount', lang));

        if (bet) {
            if (user.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: user.balance.toLocaleString() }));
            const maxBet = await getMaxBet(message.author.id);
            if (bet > maxBet) return message.reply(t('gamble.max_bet', lang, { max: maxBet.toLocaleString() }));
            if (bet < 10) return message.reply(t('gamble.min_bet', lang, { min: '10' }));
            await db.removeBalance(message.guild.id, user.id, bet);

            const { checkForGambleRaid } = require('../../utils/economy');
            if (await checkForGambleRaid(message, bet)) return;
        }

        // Grant Action XP
        await addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);

        const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎', '7️⃣'];
        let weights = [40, 32, 28, 26, 22, 16, 12];

        // Trader Interaction: Market Manipulation (Better odds)
        if (user.job === 'trader') {
            weights = [30, 28, 25, 25, 25, 22, 15]; // Even better odds for Trader
        }

        const totalWeight = weights.reduce((a, b) => a + b, 0);

        function weightedRandom() {
            let rand = Math.random() * totalWeight;
            for (let i = 0; i < symbols.length; i++) {
                rand -= weights[i];
                if (rand <= 0) return symbols[i];
            }
            return symbols[0];
        }

        const r1 = [weightedRandom(), weightedRandom(), weightedRandom()];
        const r2 = [weightedRandom(), weightedRandom(), weightedRandom()];
        const r3 = [weightedRandom(), weightedRandom(), weightedRandom()];

        // Check middle row (main payline)
        const allMatch = r2[0] === r2[1] && r2[1] === r2[2];
        let twoMatchSymbol = null;
        if (!allMatch) {
            if (r2[0] === r2[1] || r2[0] === r2[2]) twoMatchSymbol = r2[0];
            else if (r2[1] === r2[2]) twoMatchSymbol = r2[1];
        }
        const twoMatch = !!twoMatchSymbol;

        // Giữ nguyên phần thưởng khổng lồ
        // Phân cấp phần thưởng hấp dẫn hơn (RTP ~95%)
        const multiplierMap = { '7️⃣': 185, '💎': 95, '⭐': 52, '🍉': 26, '🍊': 13, '🍋': 9, '🍒': 6 };

        let result, color;
        let payout = 0;
        if (allMatch) {
            const mult = multiplierMap[r2[0]];
            result = t('slots.win_jackpot', lang, { symbol: r2[0] });
            payout = bet ? bet * mult : 0;
            color = r2[0] === '7️⃣' ? 0xFF9900 : config.COLORS.GAMBLE_WIN;
        } else if (twoMatch) {
            // Giảm độ khó: Phân cấp phần thưởng cho 2 hình khớp (RTP ~95%)
            let mult = 0.25;
            if (twoMatchSymbol === '7️⃣') mult = 1.8;
            else if (twoMatchSymbol === '💎') mult = 1.7;
            else if (twoMatchSymbol === '⭐') mult = 1.6;
            else if (twoMatchSymbol === '🍉') mult = 1.4;
            else if (twoMatchSymbol === '🍊') mult = 1.2;
            else if (twoMatchSymbol === '🍋') mult = 1.1;
            else if (twoMatchSymbol === '🍒') mult = 1.0;

            if (mult >= 1.2) {
                result = t('slots.win_small', lang);
                color = config.COLORS.GAMBLE_WIN;
            } else if (mult >= 1.0) {
                result = t('slots.win_small', lang);
                color = 0xAAAAAA; // Màu xám cho hòa vốn
            } else {
                result = t('slots.win_small', lang);
                color = config.COLORS.GAMBLE_LOSS;
            }
            payout = bet ? Math.floor(bet * mult) : 0;
        } else {
            result = t('slots.lose', lang);
            color = config.COLORS.GAMBLE_LOSS;
        }

        if (payout > 0) {
            let bonusAmount = 0;
            let percent = 0;
            let totalPayout = 0;
            let subHypeMsg = '';

            if (payout > bet) {
                const profit = payout - bet;
                const { total, bonus, percent: calculatedPercent } = await calculateReward(profit, message.member, 'gamble');
                totalPayout = total + bet;
                bonusAmount = bonus;
                percent = calculatedPercent;
            } else {
                totalPayout = payout;
            }

            // Grant Win XP
            const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
            await addXp(message.member, winXp, message.guild.id);

            await db.addBalance(message.guild.id, user.id, totalPayout);
            if (totalPayout > bet) {
                result += t('slots.won_coins', lang, { emoji: config.EMOJIS.COIN, amount: (totalPayout - bet).toLocaleString() });
            } else {
                result += t('slots.partial_refund', lang, { emoji: config.EMOJIS.COIN, amount: totalPayout.toLocaleString() });
            }
            if (subHypeMsg) result += subHypeMsg;
            if (bonusAmount > 0) {
                result += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), percent, emoji: config.EMOJIS.COIN });
            }
        } else if (bet) {
            result += t('slots.lost_coins', lang, { amount: bet.toLocaleString(), emoji: config.EMOJIS.COIN });
            // Transfer lost bet to bot profit
            await addHouseProfit(message, bet); // If payout is 0, the full bet is lost
        }

        const slotDisplay = [
            '┌──────────────┐',
            `│ ${r1.join(' │ ')} │`,
            '├──────────────┤',
            `│ ${r2.join(' │ ')} │ ◀`,
            '├──────────────┤',
            `│ ${r3.join(' │ ')} │`,
            '└──────────────┘',
        ].join('\n');

        const embed = new EmbedBuilder()
            .setTitle(t('slots.title', lang))
            .setDescription(`${slotDisplay}\n\n${result}${user.job === 'trader' ? t('common.market_tip_short', lang) : ''}`)
            .setColor(color).setTimestamp();

        startCooldown(message.client, 'slots', message.author.id);
        return message.reply({ embeds: [embed] });
    }
};
