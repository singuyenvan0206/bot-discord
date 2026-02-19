const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'dice',
    aliases: ['roll', 'd'],
    description: 'Roll dice or bet on the outcome!',
    async execute(message, args) {
        const user = db.getUser(message.author.id);
        const input = args[0]?.toLowerCase();

        // Gambling Mode: !dice <high/low/odd/even/7/num> <bet>
        // High: 8-12, Low: 2-6 (7 is loss)
        if (['high', 'low', 'odd', 'even', '7'].includes(input) || (parseInt(input) >= 2 && parseInt(input) <= 12)) {
            let bet = parseInt(args[1]);
            if (!args[1]) bet = 50; // Default

            if (!bet || isNaN(bet) || bet <= 0) return message.reply('❌ Invalid bet amount!');
            if (user.balance < bet) return message.reply(`❌ Insufficient funds! Balance: **${user.balance}**`);

            db.removeBalance(user.id, bet);

            // Roll 2 Dice
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const roll = d1 + d2;

            let won = false;
            let multiplier = 2; // Default 2x

            if (input === 'high' && roll > 7) won = true;        // 8-12
            else if (input === 'low' && roll < 7) won = true;    // 2-6
            else if (input === 'even' && roll % 2 === 0) won = true;
            else if (input === 'odd' && roll % 2 !== 0) won = true;
            else if (input === '7' && roll === 7) {
                won = true;
                multiplier = 4; // 7 is harder (16.6%) -> 4x payout
            }
            else if (parseInt(input) === roll) {
                won = true;
                // Specific number payouts could vary, but let's keep it simple or weighted?
                // 2 and 12 are hardest (1/36). 7 is easiest (6/36).
                // Let's settle on a flat 5x for any specific number for simplicity.
                multiplier = 5;
            }

            let prize = won ? bet * multiplier : 0;

            if (won) {
                const { getUserMultiplier } = require('../../utils/multiplier');
                const bonusMult = getUserMultiplier(user.id, 'gamble');
                const bonus = Math.floor(prize * bonusMult);
                prize += bonus;
                db.addBalance(user.id, prize);
            }

            const resultMsg = won ? `🎉 **You Won!** (+${prize})` : `💸 **You Lost!** (-${bet})`;
            if (won) {
                const multiplier = require('../../utils/multiplier').getUserMultiplier(user.id, 'gamble');
                if (multiplier > 0 && resultMsg.includes('Won')) {
                    // Hacky way to append if I don't want to rewrite the whole string construction
                }
            }
            const color = won ? 0x2ECC71 : 0xE74C3C;

            const embed = new EmbedBuilder()
                .setTitle('🎲  Dice Gamble (2d6)')
                .setDescription(`You bet **${bet}** on **${input}**...\nRolls: 🎲 **${d1}** + **${d2}** = **${roll}**\n\n${resultMsg}`)
                .setColor(color);

            return message.reply({ embeds: [embed] });
        }

        // Standard Mode: !dice [sides] [count]
        const sides = parseInt(args[0]) || 6;
        const count = parseInt(args[1]) || 2;

        if (sides < 2 || sides > 100) return message.reply('❌ Sides must be between 2 and 100.');
        if (count < 1 || count > 10) return message.reply('❌ You can only roll 1-10 dice.');

        const rolls = [];
        let total = 0;
        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎲  Dice Roll')
            .setDescription(`Rolling **${count}** x **d${sides}**`)
            .addFields(
                { name: 'Rolls', value: rolls.join(', '), inline: true },
                { name: 'Total', value: `**${total}**`, inline: true }
            )
            .setColor(0x3498DB);

        return message.reply({ embeds: [embed] });
    }
};
