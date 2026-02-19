const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');

module.exports = {
    name: 'reaction',
    aliases: ['react'],
    description: 'Test your reaction speed',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setTitle('⚡  Reaction Test')
            .setDescription('Wait for it...')
            .setColor(0xE74C3C);

        const msg = await message.reply({ embeds: [embed] });

        const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds

        setTimeout(async () => {
            const now = Date.now();
            embed.setDescription('**TYPE "NOW"!**').setColor(0x2ECC71);
            await msg.edit({ embeds: [embed] });

            try {
                const collected = await message.channel.awaitMessages({
                    filter: m => m.content.toLowerCase() === 'now' && !m.author.bot,
                    max: 1,
                    time: 5000,
                    errors: ['time']
                });

                const winner = collected.first();
                const diff = winner.createdTimestamp - now;

                // Reward based on reaction speed
                let reward = 15;
                let speedRank = '🐢 Nice';
                if (diff < 300) { reward = 50; speedRank = '⚡ Insane'; }
                else if (diff < 500) { reward = 30; speedRank = '🏎️ Fast'; }
                db.addBalance(winner.author.id, reward);

                winner.reply(`🎉 **${diff}ms!** ${speedRank}!\n💰 **+${reward} coins!**`);
                startCooldown(message.client, 'reaction', message.author.id);
            } catch {
                message.channel.send('⏰ **Too slow!** No one reacted in time.');
                startCooldown(message.client, 'reaction', message.author.id);
            }
        }, delay);
    }
};
