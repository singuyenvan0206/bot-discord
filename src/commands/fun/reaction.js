const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'reaction',
    aliases: ['react'],
    description: 'Test your reaction speed',
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

                winner.reply(`🎉 **${diff}ms!** That was fast! 🏎️`);
            } catch {
                message.channel.send('⏰ **Too slow!** No one reacted in time.');
            }
        }, delay);
    }
};
