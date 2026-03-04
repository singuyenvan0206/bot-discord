const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const { startCooldown } = require('../../utils/cooldown');
const { parseAmount, addHouseProfit, getMaxBet } = require('../../utils/economy');
const { getUserMultiplier, calculateReward } = require('../../utils/multiplier');
const { addXp, XP_AMOUNTS } = require('../../utils/leveling');

module.exports = {
    name: 'coinflip',
    aliases: ['flip', 'cf'],
    description: 'Tung đồng xu đặt cược (Flip a coin to gamble)',
    cooldown: 10,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);

        let call = args[0] ? args[0].toLowerCase() : null;
        const maxBetLimit = await getMaxBet(message.author.id);
        let bet = args[1] ? parseAmount(args[1], user.balance, maxBetLimit) : 0;

        // Support vn side names and shorthands
        if (call === 'ngửa' || call === 'ngua' || call === 'h' || call === 'head' || call === 'n') call = 'heads';
        if (call === 'sấp' || call === 'sap' || call === 't' || call === 'tail' || call === 's') call = 'tails';

        if (call !== 'heads' && call !== 'tails') {
            return message.reply(t('coinflip.invalid_side', lang, { prefix: config.PREFIX }));
        }

        if (bet > 0) {
            if (user.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: user.balance.toLocaleString() }));

            const maxBet = await getMaxBet(message.author.id);
            if (bet > maxBet) return message.reply(t('common.max_bet_error', lang, { limit: maxBet.toLocaleString() }));
            if (bet < 10) return message.reply(t('common.min_bet_error', lang, { limit: '10' }));
            await db.removeBalance(message.guild.id, user.id, bet);
        }

        // Grant Action XP
        await addXp(message.member, Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min, message.guild.id);

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = call === result;

        const displayCall = t(`coinflip.${call}`, lang);
        const displayResult = t(`coinflip.${result}`, lang);

        let flavorText = '';

        if (won) {
            // Calculate reward including bonuses
            const { total, bonus, percent } = await calculateReward(bet, message.member, 'gamble');

            let payout = total + bet;
            await db.addBalance(message.guild.id, message.author.id, payout);

            // Grant Win XP
            const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
            await addXp(message.member, winXp, message.guild.id);

            flavorText = t('coinflip.win_msg', lang, { amount: total.toLocaleString(), emoji: config.EMOJIS.COIN });
            if (bonus > 0) {
                flavorText += `\n✨ **Bonus:** +${percent.toLocaleString()}% (${bonus.toLocaleString()} ${config.EMOJIS.COIN})`;
            }
        } else {
            flavorText = t('coinflip.lose', lang, { amount: bet.toLocaleString(), emoji: config.EMOJIS.COIN });
            if (bet) await addHouseProfit(message, bet);

            // Trader Interaction: Market Tip (25% chance to refund 50% on loss)
            if (user.job === 'trader' && Math.random() < 0.25) {
                const refund = Math.floor(bet * 0.5);
                await db.addBalance(message.guild.id, user.id, refund);
                flavorText += t('common.market_tip', lang);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(t('coinflip.title', lang))
            .setDescription(
                t('coinflip.description', lang, { call: displayCall, result: displayResult }) +
                `\n\n${flavorText}`
            )
            .setColor(won ? config.COLORS.GAMBLE_WIN : config.COLORS.GAMBLE_LOSS);

        startCooldown(message.client, 'coinflip', message.author.id);
        return message.reply({ embeds: [embed] });
    }
};
