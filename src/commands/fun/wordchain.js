const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'wordchain',
    aliases: ['wc'],
    description: 'Play Word Chain',
    async execute(message, args) {
        if (message.client.activeChainGames?.has(message.channel.id)) {
            return message.reply('❌ A word chain game is already running in this channel! Type `!stop` to end it.');
        }

        if (!message.client.activeChainGames) message.client.activeChainGames = new Set();
        message.client.activeChainGames.add(message.channel.id);

        let usedWords = new Set();
        let lastChar = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // Random letter
        let turn = null;
        let lives = { [message.author.id]: 3 };
        let players = [message.author.id];

        const embed = new EmbedBuilder()
            .setTitle('🔗  Word Chain (No Time Limit)')
            .setDescription(`Game started! The first word must start with **${lastChar.toUpperCase()}**.\n\nType a word to join!`)
            .setColor(0x3498DB)
            .setFooter({ text: 'Type !stop to end game' });

        const gameMsg = await message.channel.send({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot,
            // Infinite time, no idle
        });

        collector.on('collect', async m => {
            const word = m.content.toLowerCase();

            // Check for stop command
            if (word === '!stop') {
                // Allow any player or admin to stop the game
                if (players.includes(m.author.id) || m.member.permissions.has('ManageMessages')) {
                    collector.stop('stopped');
                    return message.channel.send(`🛑 **Game stopped by ${m.author}!**`);
                }
            }

            // Join game logic / Initialize player
            if (!players.includes(m.author.id)) {
                players.push(m.author.id);
                lives[m.author.id] = 3;
            }

            // check if player is dead
            if (lives[m.author.id] <= 0) return;

            // Strict or Loose Turn Logic? 
            // Anti-spam: User cannot answer twice in a row immediately (unless playing solo, but wordchain is multiplayer)
            // Let's enforce: If you were the last person to answer, you can't answer again immediately.
            if (m.author.id === turn) {
                return m.react('⏳'); // Rate limit / turn limit
            }

            // Invalid word checks
            let invalidReason = null;
            if (usedWords.has(word)) invalidReason = 'Word already used!';
            else if (word.charAt(0) !== lastChar) invalidReason = `Must start with **${lastChar.toUpperCase()}**!`;
            else if (word.length < 3) invalidReason = 'Must be 3+ letters!';
            // Note: In a real bot we'd check a dictionary here.

            if (invalidReason) {
                lives[m.author.id]--;
                await m.react('❌');
                const warningMsg = await message.channel.send(`⚠️ ${m.author}, ${invalidReason} (**${lives[m.author.id]}** lives remaining)`);
                setTimeout(() => warningMsg.delete().catch(() => { }), 3000);

                if (lives[m.author.id] <= 0) {
                    message.channel.send(`💀 ${m.author} has been eliminated!`);
                }
                return;
            }

            usedWords.add(word);
            lastChar = word.slice(-1);
            turn = m.author.id; // Mark this user as the last one to answer

            await m.react('✅');

            const nextEmbed = new EmbedBuilder()
                .setTitle('🔗  Word Chain (No Time Limit)')
                .setDescription(`**${m.author.username}** said **${word}**!\n\nNext word must start with: **${lastChar.toUpperCase()}**`)
                .setColor(0x2ECC71)
                .setFooter({ text: `Type !stop to end game • Lives: ${lives[m.author.id]}` });

            await gameMsg.edit({ embeds: [nextEmbed] });
            // collector.resetTimer(); // No timer to reset
        });

        collector.on('end', (collected, reason) => {
            message.client.activeChainGames.delete(message.channel.id);
            if (reason === 'stopped') {
                // Message already sent by the stop command handler
            } else {
                // This case should ideally not be reached with no idle timer,
                // unless the channel is deleted or bot is shut down.
                message.channel.send('🛑 **Word Chain Game Over!** The game ended unexpectedly.');
            }
        });
    }
};
