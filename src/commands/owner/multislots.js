const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { calculateReward } = require('../../utils/multiplier');
const { parseAmount, addHouseProfit, getMaxBet } = require('../../utils/economy');
const { XP_AMOUNTS, addXp } = require('../../utils/leveling');

module.exports = {
    name: 'multislots',
    aliases: ['mslots', 'msl'],
    description: 'Quay hũ nhiều lần (Multi-Slot Machine)',
    cooldown: 10,
    async execute(message, args) {
        if (message.author.id !== config.OWNER_ID) {
            return message.reply('❌ This command is restricted to the bot owner.');
        }

        const user = await db.getUser(message.author.id, message.guild.id);

        // Limits: Max 100
        const maxCount = 100;
        const count = Math.min(maxCount, Math.max(1, parseInt(args[0]) || 1));

        const maxBetLimit = await getMaxBet(message.author.id);
        const betPerSpin = args[1] ? parseAmount(args[1], user.balance, maxBetLimit) : 50;

        if (isNaN(betPerSpin) || betPerSpin <= 0) return message.reply('common.invalid_amount');
        if (betPerSpin < 10) return message.reply('gamble.min_bet', { min: '10' });
        if (betPerSpin > maxBetLimit) return message.reply('gamble.max_bet', { max: maxBetLimit.toLocaleString() });

        const totalBet = count * betPerSpin;
        if (user.balance < totalBet) {
            return message.reply('common.insufficient_funds', { balance: user.balance.toLocaleString() });
        }

        // Upfront Deduction
        await db.removeBalance(message.guild.id, user.id, totalBet);
        await addHouseProfit(message, totalBet);

        // Slot Logic Setup
        const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎', '7️⃣'];
        let weights = [150, 110, 90, 70, 45, 32, 22];
        if (user.job === 'trader') weights = [110, 100, 90, 80, 60, 45, 35];

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        function weightedRandom() {
            let rand = Math.random() * totalWeight;
            for (let i = 0; i < symbols.length; i++) {
                rand -= weights[i];
                if (rand <= 0) return symbols[i];
            }
            return symbols[0];
        }

        const multiplierMap = { '7️⃣': 150, '💎': 80, '⭐': 40, '🍉': 5, '🍊': 3, '🍋': 2, '🍒': 1.5 };

        let totalWon = 0;
        let totalBonus = 0;
        let stats = { jackpots: 0, smallWins: 0, losses: 0 };
        let bestWin = { amount: 0, mult: 0, symbol: '' };
        let totalXp = 0;

        for (let i = 0; i < count; i++) {
            // Roll symbols
            const r2 = [weightedRandom(), weightedRandom(), weightedRandom()];

            const allMatch = r2[0] === r2[1] && r2[1] === r2[2];
            let twoMatchSymbol = null;
            if (!allMatch) {
                if (r2[0] === r2[1] || r2[0] === r2[2]) twoMatchSymbol = r2[0];
                else if (r2[1] === r2[2]) twoMatchSymbol = r2[1];
            }

            let payout = 0;
            let currentMult = 0;

            if (allMatch) {
                currentMult = multiplierMap[r2[0]];
                payout = betPerSpin * currentMult;
                stats.jackpots++;
                if (currentMult > bestWin.mult) bestWin = { amount: payout, mult: currentMult, symbol: r2[0] };
            } else if (twoMatchSymbol) {
                if (twoMatchSymbol === '7️⃣') currentMult = 10;
                else if (twoMatchSymbol === '💎') currentMult = 8;
                else if (twoMatchSymbol === '⭐') currentMult = 5;
                else if (twoMatchSymbol === '🍉') currentMult = 2.5;
                else if (twoMatchSymbol === '🍊') currentMult = 1.8;
                else if (twoMatchSymbol === '🍋') currentMult = 1.4;
                else if (twoMatchSymbol === '🍒') currentMult = 1.2;

                payout = Math.floor(betPerSpin * currentMult);
                stats.smallWins++;
                if (currentMult > bestWin.mult) bestWin = { amount: payout, mult: currentMult, symbol: twoMatchSymbol };
            } else {
                stats.losses++;
            }

            if (payout > 0) {
                if (payout > betPerSpin) {
                    const profit = payout - betPerSpin;
                    const { total, bonus } = await calculateReward(profit, message.member, 'gamble');
                    totalWon += (total + betPerSpin);
                    totalBonus += bonus;
                } else {
                    totalWon += payout;
                }
                const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
                totalXp += winXp;
            }

            const actionXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_ACTION.max - XP_AMOUNTS.GAME_ACTION.min + 1)) + XP_AMOUNTS.GAME_ACTION.min;
            totalXp += actionXp;
        }

        // Save Results
        if (totalWon > 0) {
            await db.addBalance(message.guild.id, user.id, totalWon);
        }
        await addXp(message.member, totalXp, message.guild.id);

        // Build Summary
        const netProfit = totalWon - totalBet;
        const winRate = ((stats.jackpots + stats.smallWins) / count * 100).toFixed(1);

        const embed = new EmbedBuilder()
            .setTitle(`🎰 Multi-Slots Results (x${count})`)
            .setColor(netProfit >= 0 ? config.COLORS.SUCCESS : config.COLORS.ERROR)
            .setDescription(
                `**User:** <@${message.author.id}>\n` +
                `**Bet per spin:** \`${betPerSpin.toLocaleString()}\` ${config.EMOJIS.COIN}\n` +
                `**Total Bet:** \`${totalBet.toLocaleString()}\` ${config.EMOJIS.COIN}\n` +
                `**Total Won:** \`${totalWon.toLocaleString()}\` ${config.EMOJIS.COIN}\n` +
                `**Net Profit:** \`${netProfit.toLocaleString()}\` ${config.EMOJIS.COIN}\n\n` +
                `📊 **Stats:**\n` +
                `└ Jackpots: \`x${stats.jackpots}\`\n` +
                `└ Small Wins: \`x${stats.smallWins}\`\n` +
                `└ Losses: \`x${stats.losses}\` \n` +
                `└ Win Rate: \`${winRate}%\``
            )
            .addFields(
                { name: '🌟 Best Hit', value: bestWin.mult > 0 ? `${bestWin.symbol} **x${bestWin.mult}** (\`${bestWin.amount.toLocaleString()}\` ${config.EMOJIS.COIN})` : 'None', inline: true },
                { name: '✨ XP Earned', value: `\`+${totalXp.toLocaleString()}\` XP`, inline: true }
            );

        if (totalBonus > 0) {
            embed.setFooter({ text: `Included +${totalBonus.toLocaleString()} bonus coins from multipliers.` });
        }

        return message.reply({ embeds: [embed] });
    }
};
