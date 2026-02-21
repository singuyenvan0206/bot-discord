const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');
const { startCooldown } = require('../../utils/cooldown');
const { parseAmount } = require('../../utils/economy');
const { getUserMultiplier } = require('../../utils/multiplier');

module.exports = {
    name: 'coinflip',
    aliases: ['flip', 'cf'],
    description: 'Tung đồng xu',
    cooldown: 10,
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const user = db.getUser(message.author.id);

        let call = args[0] ? args[0].toLowerCase() : null;
        let bet = args[1] ? parseAmount(args[1], user.balance) : 0;

        // Support vn side names and shorthands
        if (call === 'ngửa' || call === 'ngua' || call === 'h' || call === 'n') call = 'heads';
        if (call === 'sấp' || call === 'sap' || call === 't' || call === 's') call = 'tails';

        if (call !== 'heads' && call !== 'tails') {
            return message.reply(t('coinflip.invalid_side', lang, { prefix: config.PREFIX }));
        }

        if (bet > 0) {
            if (user.balance < bet) return message.reply(t('common.insufficient_funds', lang, { balance: user.balance }));
            if (bet > config.ECONOMY.MAX_BET) return message.reply(t('common.max_bet_error', lang, { limit: config.ECONOMY.MAX_BET.toLocaleString() }));
            db.removeBalance(user.id, bet);
        }

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = call === result;

        const displayCall = t(`coinflip.${call}`, lang);
        const displayResult = t(`coinflip.${result}`, lang);

        let payout = 0;
        let flavorText = '';

        if (won) {
            payout = bet * 2;
            const multiplier = getUserMultiplier(user.id, 'gamble');
            const bonus = Math.floor(payout * multiplier);
            payout += bonus;

            if (payout > 0) db.addBalance(user.id, payout);
            flavorText = t('coinflip.win', lang, { amount: payout });
            if (bonus > 0) flavorText += t('slots.bonus_item', lang, { amount: bonus, percent: Math.round(multiplier * 100) });
        } else {
            flavorText = t('coinflip.lose', lang, { amount: bet });
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
