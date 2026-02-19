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
        let lastChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        let turn = null;
        let players = [message.author.id];

        const embed = new EmbedBuilder()
            .setTitle('🔗  Word Chain')
            .setDescription(`Game started! The first word must start with **${lastChar.toUpperCase()}**.\n\nType a word to join!`)
            .setColor(0x3498DB)
            .setFooter({ text: 'Type !stop to end game' });

        await message.channel.send({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot,
        });

        collector.on('collect', async m => {
            const word = m.content.toLowerCase();

            // Check for stop command
            if (word === '!stop') {
                if (players.includes(m.author.id) || m.member.permissions.has('ManageMessages')) {
                    collector.stop('stopped');
                    return message.channel.send(`🛑 **Game stopped by ${m.author}!**`);
                }
            }

            // Join game logic
            if (!players.includes(m.author.id)) {
                players.push(m.author.id);
            }

            // Anti-spam: cannot answer twice in a row
            if (m.author.id === turn) {
                return m.react('⏳');
            }

            // Invalid word checks
            let invalidReason = null;
            if (usedWords.has(word)) invalidReason = 'Word already used!';
            else if (word.charAt(0) !== lastChar) invalidReason = `Must start with **${lastChar.toUpperCase()}**!`;
            else if (word.length < 3) invalidReason = 'Must be 3+ letters!';

            if (invalidReason) {
                await m.react('❌');
                const warningMsg = await message.channel.send(`⚠️ ${m.author}, ${invalidReason}`);
                setTimeout(() => warningMsg.delete().catch(() => { }), 3000);
                return;
            }

            usedWords.add(word);
            lastChar = word.slice(-1);
            turn = m.author.id;

            await m.react('✅');
        });

        collector.on('end', (collected, reason) => {
            message.client.activeChainGames.delete(message.channel.id);
            if (reason !== 'stopped') {
                message.channel.send('🛑 **Word Chain Game Over!**');
            }
        });
    }
};
