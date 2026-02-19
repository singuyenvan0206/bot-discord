const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

const SCRAMBLE_WORDS = [
    { word: 'DISCORD', hint: 'A chat platform' },
    { word: 'JAVASCRIPT', hint: 'A programming language' },
    { word: 'GIVEAWAY', hint: 'Free stuff!' },
    { word: 'KEYBOARD', hint: 'You type on it' },
    { word: 'COMPUTER', hint: 'A machine for work and games' },
    { word: 'INTERNET', hint: 'Connects the world' },
    { word: 'ELEPHANT', hint: 'Largest land animal' },
    { word: 'TREASURE', hint: 'Pirates search for it' },
    { word: 'MOUNTAIN', hint: 'Very tall landform' },
    { word: 'DINOSAUR', hint: 'Extinct reptile' },
    { word: 'FOOTBALL', hint: 'Popular sport' },
    { word: 'SANDWICH', hint: 'Bread with filling' },
    { word: 'FIREWORK', hint: 'Explodes in the sky' },
    { word: 'UMBRELLA', hint: 'Keeps rain off you' },
    { word: 'BIRTHDAY', hint: 'Celebrated once a year' },
    { word: 'AIRPLANE', hint: 'Flies in the sky' },
    { word: 'MUSHROOM', hint: 'A fungus you can eat' },
    { word: 'CHAMPION', hint: 'The winner' },
    { word: 'PAINTING', hint: 'Art on canvas' },
    { word: 'LANGUAGE', hint: 'Used to communicate' },
    { word: 'PYTHON', hint: 'A snake or a coding language' },
    { word: 'BANANA', hint: 'Yellow curved fruit' },
    { word: 'GALAXY', hint: 'Contains solar systems' },
    { word: 'PUZZLE', hint: 'You solve it' },
    { word: 'JUNGLE', hint: 'Wild forest' },
    { word: 'GUITAR', hint: 'Musical instrument with strings' },
    { word: 'DOCTOR', hint: 'Treats sick people' },
    { word: 'SCHOOL', hint: 'Place for learning' },
    { word: 'SUMMER', hint: 'Hot season' },
    { word: 'WINTER', hint: 'Cold season' },
    { word: 'PLANET', hint: 'Orbits a star' },
    { word: 'ROCKET', hint: 'Goes to space' },
    { word: 'COFFEE', hint: 'Morning drink' },
    { word: 'CAMERA', hint: 'Takes photos' },
    { word: 'ZOMBIE', hint: 'Undead creature' },
    { word: 'PIRATE', hint: 'Sails the seas for gold' },
    { word: 'ROBOT', hint: 'Mechanical being' },
    { word: 'CASTLE', hint: 'Where kings live' },
    { word: 'DIAMOND', hint: 'Precious gem' },
    { word: 'DRAGON', hint: 'Fire breathing beast' },
    { word: 'TOMATO', hint: 'Red fruit/vegetable' },
    { word: 'ORANGE', hint: 'A color and a fruit' },
    { word: 'PURPLE', hint: 'Color of royalty' },
    { word: 'SQUARE', hint: 'Shape with 4 equal sides' },
    { word: 'CIRCLE', hint: 'Round shape' },
    { word: 'FRIEND', hint: 'Someone you like' },
    { word: 'BOTTLE', hint: 'Holds liquid' },
    { word: 'WINDOW', hint: 'You look through it' },
    { word: 'GARDEN', hint: 'Where plants grow' },
    { word: 'BRIDGE', hint: 'Connects two places' },
    { word: 'KEYBOARD', hint: 'Input device' },
    { word: 'MONITOR', hint: 'Output display' },
    { word: 'SPEAKER', hint: 'Produces sound' },
    { word: 'HEADPHONE', hint: 'Personal audio' },
    { word: 'LAPTOP', hint: 'Portable computer' },
    { word: 'CHARGER', hint: 'Gives power' },
    { word: 'BATTERY', hint: 'Stores energy' },
    { word: 'NETWORK', hint: 'Connected computers' },
    { word: 'SERVER', hint: 'Hosts data' },
    { word: 'DATABASE', hint: 'Stores information' },
    { word: 'WEBSITE', hint: 'Pages on the internet' },
    { word: 'BROWSER', hint: 'Views websites' },
    { word: 'PROGRAM', hint: 'Set of instructions' },
    { word: 'ALGORITHM', hint: 'Step by step procedure' },
    { word: 'VARIABLE', hint: 'Stores a value' },
    { word: 'FUNCTION', hint: 'Reusable code block' },
    { word: 'ARRAY', hint: 'List of items' },
    { word: 'OBJECT', hint: 'Key value pairs' },
    { word: 'STRING', hint: 'Text data type' },
    { word: 'BOOLEAN', hint: 'True or False' },
    { word: 'INTEGER', hint: 'Whole number' },
    { word: 'FLOAT', hint: 'Decimal number' },
    { word: 'SYNTAX', hint: 'Grammar of code' },
    { word: 'ERROR', hint: 'Something went wrong' },
    { word: 'DEBUG', hint: 'Fixing errors' },
    { word: 'COMPILE', hint: 'Build code' },
    { word: 'RUNTIME', hint: 'When code executes' },
    { word: 'MEMORY', hint: 'RAM' },
    { word: 'STORAGE', hint: 'Hard drive' },
    { word: 'LINUX', hint: 'Open source OS' },
    { word: 'WINDOWS', hint: 'Microsoft OS' },
    { word: 'APPLE', hint: 'Tech giant or fruit' },
    { word: 'ANDROID', hint: 'Mobile OS' },
    { word: 'ROUTER', hint: 'Directs traffic' },
    { word: 'SWITCH', hint: 'Network device or console' },
    { word: 'MODEM', hint: 'Connects to ISP' },
    { word: 'WIFI', hint: 'Violent connection... wait no' },
    { word: 'BLUETOOTH', hint: 'Wireless short range' },
    { word: 'ETHERNET', hint: 'Wired connection' },
    { word: 'FIREWALL', hint: 'Network security' },
    { word: 'VIRUS', hint: 'Malware' },
    { word: 'HACKER', hint: 'Breaks into systems' },
    { word: 'PASSWORD', hint: 'Secret key' },
    { word: 'ENCRYPTION', hint: 'Scrambles data perfectly' },
    { word: 'BITCOIN', hint: 'Crypto currency' },
    { word: 'BLOCKCHAIN', hint: 'Chain of blocks' },
    { word: 'ROBOTICS', hint: 'Building robots' },
    { word: 'AUTOMATION', hint: 'Self operating' },
    { word: 'ARTIFICIAL', hint: 'Not natural' },
    { word: 'INTELLIGENCE', hint: 'Smarts' },
];

module.exports = {
    name: 'hangman',
    aliases: ['hang', 'hm'],
    description: 'Play Hangman!',
    cooldown: 10,
    async execute(message, args) {
        const wordObj = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
        const word = wordObj.word.toUpperCase();
        const hint = wordObj.hint;
        const guessed = new Set();
        let lives = 6;
        let gameOver = false;

        function getDisplay() {
            return word.split('').map(l => guessed.has(l) ? l : '\\_').join(' ');
        }

        const embed = new EmbedBuilder()
            .setTitle('😵  Hangman')
            .setDescription(`**Hint:** ${hint}\n\n**Word:** ${getDisplay()}\n**Lives:** ${'❤️'.repeat(lives)}\n\n**Guessed:** ${Array.from(guessed).join(', ') || 'None'}`)
            .setColor(0x3498DB)
            .setFooter({ text: 'Type a letter to guess!' });

        const msg = await message.reply({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => m.author.id === message.author.id && /^[a-zA-Z]+$/.test(m.content) && !m.author.bot,
            time: 120_000
        });

        collector.on('collect', async m => {
            if (gameOver) return;
            m.delete().catch(() => { });

            const input = m.content.toUpperCase();

            // Full Word Guess
            if (input.length > 1) {
                if (input === word) {
                    gameOver = true;
                    const reward = 50;
                    db.addBalance(message.author.id, reward);
                    embed.setDescription(`**Word:** ${word}\n\n🎉 **YOU WON!** (You guessed the full word!)\n💰 **+${reward} coins!**`)
                        .setColor(0x2ECC71);
                    collector.stop();
                    await msg.edit({ embeds: [embed] });
                    return;
                } else {
                    lives--;
                    // Optional: Feedback for wrong word?
                }
            } else {
                // Single Letter Guess
                if (guessed.has(input)) return;
                guessed.add(input);
                if (!word.includes(input)) lives--;
            }

            const currentDisplay = getDisplay();
            const won = !currentDisplay.includes('\\_');
            const lost = lives <= 0;

            if (gameOver) return; // Already handled above if won by full word

            if (won || lost) {
                gameOver = true;
                let resultText = won ? '🎉 **YOU WON!**' : '💀 **YOU DIED!**';
                if (won) {
                    const reward = 50;
                    db.addBalance(message.author.id, reward);
                    resultText += `\n💰 **+${reward} coins!**`;
                }
                embed.setDescription(`**Word:** ${word}\n\n${resultText}`)
                    .setColor(won ? 0x2ECC71 : 0xE74C3C);
                collector.stop();
            } else {
                embed.setDescription(`**Hint:** ${hint}\n\n**Word:** ${currentDisplay}\n**Lives:** ${'❤️'.repeat(lives)}\n\n**Guessed:** ${Array.from(guessed).join(', ') || 'None'}`);
            }

            await msg.edit({ embeds: [embed] });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !gameOver) {
                embed.setDescription(`⏰ **Time's up!** The word was **${word}**.`).setColor(0x95A5A6);
                msg.edit({ embeds: [embed] });
            }
        });
    }
};
