const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'slots',
    aliases: ['slot'],
    description: 'Spin the slot machine!',
    async execute(message, args) {
        let bet = parseInt(args[0]);
        if (!args[0]) bet = 50; // Default
        const user = db.getUser(message.author.id);

        if (args[0] && (isNaN(bet) || bet <= 0)) return message.reply('❌ Invalid bet amount.');

        if (bet) {
            if (user.balance < bet) return message.reply(`❌ Not enough money! Balance: **${user.balance}**`);
            db.removeBalance(user.id, bet);
        }

        const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎', '7️⃣'];
        const weights = [25, 20, 18, 15, 12, 7, 3]; // rarer = less weight
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

        const multiplierMap = { '7️⃣': 100, '💎': 50, '⭐': 25, '🍉': 10, '🍊': 5, '🍋': 3, '🍒': 2 };

        let result, color;
        let payout = 0;
        if (allMatch) {
            const mult = multiplierMap[r2[0]];
            result = `🎰 **JACKPOT! THREE ${r2[0]}!**`;
            payout = bet ? bet * mult : 0;
            color = r2[0] === '7️⃣' ? 0xFFD700 : 0x2ECC71;
        } else if (twoMatch) {
            const mult = 1.5;
            result = '🎰 **Two matching!** Small win!';
            payout = bet ? Math.floor(bet * mult) : 0;
            color = 0xF39C12;
        } else {
            result = '🎰 No match. Try again!';
            color = 0x95A5A6;
        }

        if (payout > 0) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const bonusMult = getUserMultiplier(user.id, 'gamble');
            const bonus = Math.floor(payout * bonusMult);
            payout += bonus;

            db.addBalance(user.id, payout);
            result += `\n💰 **Won ${payout} coins!**`;
            if (bonus > 0) result += ` *(+${Math.round(bonusMult * 100)}% bonus!)*`;
        } else if (bet) {
            result += `\n💸 **Lost ${bet} coins.**`;
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
            .setTitle('🎰  Slot Machine')
            .setDescription(`${slotDisplay}\n\n${result}`)
            .setColor(color).setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
