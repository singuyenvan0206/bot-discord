const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');

module.exports = {
    name: 'dice',
    aliases: ['roll', 'd'],
    description: 'Roll 2 dice and bet on the outcome!',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const user = db.getUser(message.author.id);

        // Parse bet amount: $dice <bet> or $dice (default 50)
        let bet = parseInt(args[0]);
        if (!args[0]) bet = 50;
        if (isNaN(bet) || bet <= 0) return message.reply('❌ Invalid bet amount! Usage: `$dice <bet>`');
        if (user.balance < bet) return message.reply(`❌ Insufficient funds! Balance: **${user.balance}** 💰`);

        const uid = Date.now().toString(36);

        // Show betting options as buttons
        const embed = new EmbedBuilder()
            .setTitle('🎲  Dice Gamble (2d6)')
            .setDescription(
                `**Bet:** ${bet} coins\n\n` +
                `Choose your prediction:\n` +
                `🔼 **High** — Total is 8-12 (2× payout)\n` +
                `🔽 **Low** — Total is 2-6 (2× payout)\n` +
                `🔢 **Odd** — Total is odd (2× payout)\n` +
                `#️⃣ **Even** — Total is even (2× payout)\n` +
                `🍀 **Lucky 7** — Total is exactly 7 (4× payout)`
            )
            .setColor(0x3498DB)
            .setFooter({ text: `Balance: ${user.balance} coins` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dice_high_${uid}`).setLabel('High').setEmoji('🔼').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`dice_low_${uid}`).setLabel('Low').setEmoji('🔽').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`dice_odd_${uid}`).setLabel('Odd').setEmoji('🔢').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`dice_even_${uid}`).setLabel('Even').setEmoji('#️⃣').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`dice_7_${uid}`).setLabel('Lucky 7').setEmoji('🍀').setStyle(ButtonStyle.Success),
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
                    embeds: [new EmbedBuilder().setTitle('🎲  Dice Gamble').setDescription('❌ You no longer have enough coins!').setColor(0xE74C3C)],
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
            let multiplier = 2;
            const choiceLabel = { high: 'High (8-12)', low: 'Low (2-6)', odd: 'Odd', even: 'Even', '7': 'Lucky 7' };

            if (choice === 'high' && roll > 7) won = true;
            else if (choice === 'low' && roll < 7) won = true;
            else if (choice === 'even' && roll % 2 === 0) won = true;
            else if (choice === 'odd' && roll % 2 !== 0) won = true;
            else if (choice === '7' && roll === 7) { won = true; multiplier = 4; }

            let prize = won ? bet * multiplier : 0;
            let bonusText = '';

            if (won) {
                const { getUserMultiplier } = require('../../utils/multiplier');
                const multiplier = getUserMultiplier(message.author.id, 'gamble');
                const bonus = Math.floor(bet * multiplier);
                prize += bonus;
                db.addBalance(message.author.id, prize);
                if (bonus > 0) bonusText = `\n✨ **Bonus:** +${bonus} coins (+${Math.round(multiplier * 100)}%)!`;
            }

            const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const resultEmbed = new EmbedBuilder()
                .setTitle('🎲  Dice Gamble (2d6)')
                .setDescription(
                    `**Prediction:** ${choiceLabel[choice]}\n` +
                    `**Bet:** ${bet} coins\n\n` +
                    `${diceEmojis[d1] || '🎲'} **${d1}** + ${diceEmojis[d2] || '🎲'} **${d2}** = **${roll}**\n\n` +
                    (won
                        ? `🎉 **You Won ${prize} coins!** (${multiplier}× payout)${bonusText}`
                        : `💸 **You Lost ${bet} coins!**`) +
                    `\n\n💰 Balance: **${db.getUser(message.author.id).balance}**`
                )
                .setColor(won ? 0x2ECC71 : 0xE74C3C);

            await i.update({ embeds: [resultEmbed], components: [] });
            startCooldown(message.client, 'dice', message.author.id);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('🎲  Dice Gamble')
                    .setDescription('⏰ You took too long! Bet cancelled.')
                    .setColor(0x95A5A6);
                reply.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => { });
            }
        });
    }
};
