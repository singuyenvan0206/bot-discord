const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { calculateReward } = require('../../utils/multiplier');
const { parseAmount, addHouseProfit, getMaxBet } = require('../../utils/economy');
const { XP_AMOUNTS, addXp } = require('../../utils/leveling');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'multislots',
    aliases: ['mslots', 'msl'],
    description: 'Quay hũ nhiều lần liên tiếp (Multi-Slot Machine)',
    cooldown: 1800,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const user = await db.getUser(message.author.id, message.guild.id);

        const maxCount = 100; // Increased to 100 as requested
        let requestedCount;
        if (args[0]?.toLowerCase() === 'all') {
            requestedCount = maxCount;
        } else {
            requestedCount = Math.max(1, parseInt(args[0]) || 1);
        }
        const count = Math.min(maxCount, requestedCount);

        const maxBetLimit = await getMaxBet(message.author.id);
        let betPerSpin;
        
        if (args[1]?.toLowerCase() === 'all') {
            betPerSpin = maxBetLimit;
        } else {
            betPerSpin = args[1] ? parseAmount(args[1], user.balance, maxBetLimit) : 50;
        }

        if (isNaN(betPerSpin) || betPerSpin <= 0) return message.reply(t('common.invalid_amount', lang));
        if (betPerSpin < 10) return message.reply(t('gamble.min_bet', lang, { min: '10' }));
        if (betPerSpin > maxBetLimit) return message.reply(t('gamble.max_bet', lang, { max: maxBetLimit.toLocaleString() }));

        let totalBet = count * betPerSpin;
        if (user.balance < totalBet) {
            // If they used 'all all', we should try to fit the count to their balance if possible, 
            // but the user specifically asked for 'all' to be 100. 
            // Let's just return the insufficient funds error as per standard behavior.
            return message.reply(t('common.insufficient_funds', lang, { balance: user.balance.toLocaleString() }));
        }

        // Upfront Deduction
        await db.removeBalance(message.guild.id, user.id, totalBet);

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
                const winXp = Math.floor(Math.random() * (10 - 5 + 1)) + 5; // 10% of XP_AMOUNTS.GAME_WIN
                totalXp += winXp;
            }
            const actionXp = (Math.random() * (1.5 - 0.5)) + 0.5; // 10% of XP_AMOUNTS.GAME_ACTION
            totalXp += actionXp;
        }

        if (totalWon > 0) {
            await db.addBalance(message.guild.id, user.id, totalWon);
        }

        if (totalWon < totalBet) {
            // Removed: await addHouseProfit(message, totalBet - totalWon).catch(() => {}); // Excluded from bot fund
        }

        const xpResult = await addXp(message.member, Math.floor(totalXp), message.guild.id);
        const finalDisplayedXP = xpResult.addedXp || totalXp;

        const netProfit = totalWon - totalBet;
        const winRate = ((stats.jackpots + stats.smallWins) / count * 100).toFixed(1);

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTitle(`🎰 Kết quả Quay hũ x${count}`)
            .setColor(netProfit >= 0 ? config.COLORS.SUCCESS : config.COLORS.ERROR)
            .setDescription(
                `**Mức cược:** \`${betPerSpin.toLocaleString()}\` ${config.EMOJIS.COIN}\n` +
                `**Tổng cược:** \`${totalBet.toLocaleString()}\` ${config.EMOJIS.COIN}\n` +
                `**Tổng thắng:** \`${totalWon.toLocaleString()}\` ${config.EMOJIS.COIN}\n` +
                `**Lợi nhuận:** \`${netProfit.toLocaleString()}\` ${config.EMOJIS.COIN}\n\n` +
                `📊 **Thống kê:**\n` +
                `└ Jackpots: \`x${stats.jackpots}\` 🎉\n` +
                `└ Thắng nhỏ: \`x${stats.smallWins}\` ✨\n` +
                `└ Thất bại: \`x${stats.losses}\` 💀\n` +
                `└ Tỉ lệ thắng: \`${winRate}%\``
            )
            .addFields(
                { name: '🌟 Cú hích lớn nhất', value: bestWin.mult > 0 ? `${bestWin.symbol} **x${bestWin.mult}** (\`${bestWin.amount.toLocaleString()}\` ${config.EMOJIS.COIN})` : 'None', inline: true },
                { name: '✨ XP Nhận được', value: `\`+${finalDisplayedXP.toLocaleString()}\` XP`, inline: true }
            );

        if (totalBonus > 0) {
            embed.setFooter({ text: `Đã bao gồm +${totalBonus.toLocaleString()} xu thưởng từ các vật phẩm hỗ trợ.` });
        }

        return message.reply({ embeds: [embed] });
    }
};
