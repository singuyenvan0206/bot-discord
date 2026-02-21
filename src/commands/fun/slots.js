const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'slots',
    aliases: ['slot', 'sl'],
    description: 'Quay slot machine!',
    cooldown: 5,
    manualCooldown: true,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild.id);
        const user = db.getUser(message.author.id);
        const { parseAmount } = require('../../utils/economy');
        let bet = args[0] ? parseAmount(args[0], user.balance) : 50;

        if (args[0] && (isNaN(bet) || bet <= 0)) return message.reply(t('common.invalid_amount', lang));

        if (bet) {
            if (user.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: user.balance }));
            if (bet > config.ECONOMY.MAX_BET) return message.reply(t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() }));
            db.removeBalance(user.id, bet);
        }

        const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎', '7️⃣'];
        const weights = [22, 20, 18, 15, 12, 9, 4]; // Flatter distribution makes matching significantly harder
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
        const twoMatch = r2[0] === r2[1] || r2[1] === r2[2] || r2[0] === r2[2];

        // Adjusted multipliers for extreme difficulty
        const multiplierMap = { '7️⃣': 150, '💎': 75, '⭐': 40, '🍉': 20, '🍊': 10, '🍋': 5, '🍒': 3 };

        let result, color;
        let payout = 0;
        if (allMatch) {
            const mult = multiplierMap[r2[0]];
            result = t('slots.win_jackpot', lang, { symbol: r2[0] });
            payout = bet ? bet * mult : 0;
            color = r2[0] === '7️⃣' ? 0xFF9900 : config.COLORS.GAMBLE_WIN;
        } else if (twoMatch) {
            // Further Difficulty Increase: Two match payout completely removed - pure loss
            const mult = 0;
            result = t('slots.lose', lang); // Treat as a complete lose now
            payout = 0;
            color = config.COLORS.GAMBLE_LOSS;
        } else {
            result = t('slots.lose', lang);
            color = config.COLORS.GAMBLE_LOSS;
        }

        if (payout > 0) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(user.id, 'gamble');
            const bonus = Math.floor(bet * multiplier);
            payout += bonus;

            db.addBalance(user.id, payout);
            result += t('slots.won_coins', lang, { emoji: config.EMOJIS.COIN, amount: payout });
            if (bonus > 0) result += t('slots.bonus_item', lang, { amount: bonus, percent: Math.round(multiplier * 100) });
        } else if (bet) {
            result += t('slots.lost_coins', lang, { amount: bet });
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
            .setDescription(`${slotDisplay}\n\n${result}`)
            .setColor(color).setTimestamp();

        startCooldown(message.client, 'slots', message.author.id);
        return message.reply({ embeds: [embed] });
    }
};
