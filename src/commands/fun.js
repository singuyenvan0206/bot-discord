const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ═══════════════════════════════════════════════════════════════════
// Data Pools
// ═══════════════════════════════════════════════════════════════════

const TRIVIA_QUESTIONS = [
    { question: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], answer: 1 },
    { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], answer: 2 },
    { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
    { question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Da Vinci', 'Picasso', 'Monet'], answer: 1 },
    { question: 'What is the chemical symbol for Gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
    { question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
    { question: 'What is the speed of light?', options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '1,000,000 km/s'], answer: 0 },
    { question: 'Which country has the most population?', options: ['USA', 'India', 'China', 'Indonesia'], answer: 1 },
    { question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], answer: 2 },
    { question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], answer: 1 },
    { question: 'Which element has the atomic number 1?', options: ['Helium', 'Hydrogen', 'Oxygen', 'Carbon'], answer: 1 },
    { question: 'What is the tallest mountain in the world?', options: ['K2', 'Kangchenjunga', 'Mt. Everest', 'Lhotse'], answer: 2 },
    { question: 'Which animal is known as the King of the Jungle?', options: ['Tiger', 'Lion', 'Elephant', 'Bear'], answer: 1 },
    { question: 'How many bones are in the adult human body?', options: ['186', '206', '226', '256'], answer: 1 },
    { question: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], answer: 2 },
    { question: 'Which programming language is Discord bots commonly built with?', options: ['Java', 'Python', 'JavaScript', 'C++'], answer: 2 },
    { question: 'What does "HTTP" stand for?', options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'HyperText Transmission Process', 'High Transfer Text Protocol'], answer: 0 },
    { question: 'What is the currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Ringgit'], answer: 2 },
    { question: 'Which planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
    { question: 'What is the largest organ in the human body?', options: ['Heart', 'Liver', 'Skin', 'Brain'], answer: 2 },
];

const EIGHT_BALL_RESPONSES = [
    { text: 'It is certain.', type: 'positive' }, { text: 'Without a doubt.', type: 'positive' },
    { text: 'Yes, definitely!', type: 'positive' }, { text: 'Most likely.', type: 'positive' },
    { text: 'Outlook good.', type: 'positive' }, { text: 'Yes!', type: 'positive' },
    { text: 'Signs point to yes.', type: 'positive' },
    { text: 'Reply hazy, try again.', type: 'neutral' }, { text: 'Ask again later.', type: 'neutral' },
    { text: 'Cannot predict now.', type: 'neutral' }, { text: 'Concentrate and ask again.', type: 'neutral' },
    { text: "Don't count on it.", type: 'negative' }, { text: 'My reply is no.', type: 'negative' },
    { text: 'Outlook not so good.', type: 'negative' }, { text: 'Very doubtful.', type: 'negative' },
];

const WOULD_YOU_RATHER = [
    ['Be able to fly', 'Be able to read minds'],
    ['Live without music', 'Live without movies'],
    ['Have unlimited money', 'Have unlimited time'],
    ['Be invisible', 'Be able to teleport'],
    ['Know every language', 'Play every instrument'],
    ['Live in the future', 'Live in the past'],
    ['Have super strength', 'Have super speed'],
    ['Never sleep again', 'Never eat again'],
    ['Be famous', 'Be the smartest person alive'],
    ['Live on the moon', 'Live underwater'],
    ['Have a pet dragon', 'Have a pet unicorn'],
    ['Be able to talk to animals', 'Speak every human language'],
    ['Have x-ray vision', 'Have night vision'],
    ['Be 10 years older', 'Be 5 years younger'],
    ['Win the lottery', 'Live twice as long'],
];

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
];

const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️'];
const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ═══════════════════════════════════════════════════════════════════
// Slash Command Definition
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fun')
        .setDescription('Fun mini-games and activities!')

        .addSubcommand(sub => sub.setName('coinflip').setDescription('Flip a coin!')
            .addStringOption(opt => opt.setName('call').setDescription('Call heads or tails')
                .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })))

        .addSubcommand(sub => sub.setName('dice').setDescription('Roll dice!')
            .addIntegerOption(opt => opt.setName('sides').setDescription('Number of sides (default: 6)').setMinValue(2).setMaxValue(100))
            .addIntegerOption(opt => opt.setName('count').setDescription('Number of dice (default: 1)').setMinValue(1).setMaxValue(10)))

        .addSubcommand(sub => sub.setName('8ball').setDescription('Ask the Magic 8-Ball')
            .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true)))

        .addSubcommand(sub => sub.setName('rps').setDescription('Rock Paper Scissors!')
            .addStringOption(opt => opt.setName('choice').setDescription('Your move').setRequired(true)
                .addChoices({ name: '🪨 Rock', value: 'rock' }, { name: '📄 Paper', value: 'paper' }, { name: '✂️ Scissors', value: 'scissors' })))

        .addSubcommand(sub => sub.setName('trivia').setDescription('Answer a trivia question!'))

        .addSubcommand(sub => sub.setName('guess').setDescription('Guess the number (1-100)!'))

        .addSubcommand(sub => sub.setName('wyr').setDescription('Would You Rather?'))

        .addSubcommand(sub => sub.setName('scramble').setDescription('Unscramble the word!'))

        .addSubcommand(sub => sub.setName('blackjack').setDescription('Play Blackjack against the dealer!'))

        .addSubcommand(sub => sub.setName('tictactoe').setDescription('Play Tic-Tac-Toe!')
            .addUserOption(opt => opt.setName('opponent').setDescription('Who to play against (leave empty to play vs bot)')))

        .addSubcommand(sub => sub.setName('slots').setDescription('Spin the slot machine!'))

        .addSubcommand(sub => sub.setName('reaction').setDescription('Test your reaction speed!'))

        .addSubcommand(sub => sub.setName('wordchain').setDescription('Word chain — connect the last letter!')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'coinflip': return handleCoinflip(interaction);
            case 'dice': return handleDice(interaction);
            case '8ball': return handle8Ball(interaction);
            case 'rps': return handleRPS(interaction);
            case 'trivia': return handleTrivia(interaction);
            case 'guess': return handleGuess(interaction);
            case 'wyr': return handleWYR(interaction);
            case 'scramble': return handleScramble(interaction);
            case 'blackjack': return handleBlackjack(interaction);
            case 'tictactoe': return handleTicTacToe(interaction);
            case 'slots': return handleSlots(interaction);
            case 'reaction': return handleReaction(interaction);
            case 'wordchain': return handleWordChain(interaction);
        }
    },
};

// ═══════════════════════════════════════════════════════════════════
// Game Handlers
// ═══════════════════════════════════════════════════════════════════

// ─── Coinflip ────────────────────────────────────────────────────

async function handleCoinflip(interaction) {
    const call = interaction.options.getString('call');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const emoji = result === 'heads' ? '🪙' : '💿';

    const embed = new EmbedBuilder().setTitle(`${emoji}  Coin Flip!`).setColor(0xF1C40F).setTimestamp();

    if (call) {
        const won = call === result;
        embed.setDescription(`The coin landed on **${result.toUpperCase()}**!\n\nYou called **${call}** — ${won ? '🎉 **You win!**' : '😔 **You lose!**'}`);
    } else {
        embed.setDescription(`The coin landed on **${result.toUpperCase()}**! ${emoji}`);
    }
    return interaction.reply({ embeds: [embed] });
}

// ─── Dice ────────────────────────────────────────────────────────

async function handleDice(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder().setTitle('🎲  Dice Roll!').setColor(0xE74C3C).setTimestamp();
    if (count === 1) {
        embed.setDescription(`You rolled a **${rolls[0]}**! (d${sides})`);
    } else {
        embed.setDescription(`Rolling **${count}d${sides}**...\n\n🎯 Results: ${rolls.map(r => `\`${r}\``).join(' + ')}\n📊 **Total: ${total}**`);
    }
    return interaction.reply({ embeds: [embed] });
}

// ─── 8-Ball ──────────────────────────────────────────────────────

async function handle8Ball(interaction) {
    const question = interaction.options.getString('question');
    const response = EIGHT_BALL_RESPONSES[Math.floor(Math.random() * EIGHT_BALL_RESPONSES.length)];
    const colorMap = { positive: 0x2ECC71, neutral: 0xF39C12, negative: 0xE74C3C };

    const embed = new EmbedBuilder()
        .setTitle('🎱  Magic 8-Ball')
        .setDescription(`**Question:** ${question}\n\n**Answer:** ${response.text}`)
        .setColor(colorMap[response.type]).setTimestamp();
    return interaction.reply({ embeds: [embed] });
}

// ─── Rock Paper Scissors ─────────────────────────────────────────

async function handleRPS(interaction) {
    const userChoice = interaction.options.getString('choice');
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    const emojiMap = { rock: '🪨', paper: '📄', scissors: '✂️' };

    let result, color;
    if (userChoice === botChoice) { result = "🤝 It's a tie!"; color = 0xF39C12; }
    else if ((userChoice === 'rock' && botChoice === 'scissors') || (userChoice === 'paper' && botChoice === 'rock') || (userChoice === 'scissors' && botChoice === 'paper')) { result = '🎉 You win!'; color = 0x2ECC71; }
    else { result = '😔 You lose!'; color = 0xE74C3C; }

    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const embed = new EmbedBuilder()
        .setTitle('⚔️  Rock Paper Scissors')
        .setDescription(`You chose ${emojiMap[userChoice]} **${cap(userChoice)}**\nI chose ${emojiMap[botChoice]} **${cap(botChoice)}**\n\n**${result}**`)
        .setColor(color).setTimestamp();
    return interaction.reply({ embeds: [embed] });
}

// ─── Trivia ──────────────────────────────────────────────────────

async function handleTrivia(interaction) {
    const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
    const labels = ['A', 'B', 'C', 'D'];

    const embed = new EmbedBuilder()
        .setTitle('🧠  Trivia Time!')
        .setDescription([`**${q.question}**`, '', ...q.options.map((opt, i) => `${labels[i]}. ${opt}`), '', '⏰ **15 seconds** to answer!'].join('\n'))
        .setColor(0x3498DB).setTimestamp();

    const uid = Date.now().toString(36);
    const row = new ActionRowBuilder().addComponents(
        ...q.options.map((_, i) => new ButtonBuilder().setCustomId(`trivia_${i}_${uid}`).setLabel(labels[i]).setStyle(ButtonStyle.Secondary))
    );

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    try {
        const collected = await reply.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(`trivia_`) && i.customId.endsWith(uid), time: 15_000 });
        const chosen = parseInt(collected.customId.split('_')[1]);
        const correct = chosen === q.answer;

        const disabledRow = new ActionRowBuilder().addComponents(
            ...q.options.map((_, i) => new ButtonBuilder().setCustomId(`trivia_${i}_${uid}`).setLabel(labels[i])
                .setStyle(i === q.answer ? ButtonStyle.Success : (i === chosen && !correct ? ButtonStyle.Danger : ButtonStyle.Secondary)).setDisabled(true))
        );

        const resultEmbed = new EmbedBuilder()
            .setTitle(correct ? '✅  Correct!' : '❌  Wrong!')
            .setDescription([`**${q.question}**`, '', ...q.options.map((opt, i) => `${i === q.answer ? '✅' : (i === chosen && !correct ? '❌' : '  ')} ${labels[i]}. ${opt}`), '', correct ? `🎉 Great job!` : `The answer was **${labels[q.answer]}. ${q.options[q.answer]}**`].join('\n'))
            .setColor(correct ? 0x2ECC71 : 0xE74C3C).setTimestamp();

        await collected.update({ embeds: [resultEmbed], components: [disabledRow] });
    } catch {
        const disabledRow = new ActionRowBuilder().addComponents(
            ...q.options.map((_, i) => new ButtonBuilder().setCustomId(`trivia_${i}_${uid}`).setLabel(labels[i]).setStyle(i === q.answer ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true))
        );
        await reply.edit({ embeds: [new EmbedBuilder().setTitle("⏰  Time's Up!").setDescription(`The answer was **${labels[q.answer]}. ${q.options[q.answer]}**`).setColor(0x95A5A6)], components: [disabledRow] }).catch(() => { });
    }
}

// ─── Number Guessing ─────────────────────────────────────────────

async function handleGuess(interaction) {
    const target = Math.floor(Math.random() * 100) + 1;
    let attempts = 0;
    const maxAttempts = 7;

    const embed = new EmbedBuilder()
        .setTitle('🔢  Number Guessing Game')
        .setDescription(`I'm thinking of a number between **1** and **100**.\n\n🎯 You have **${maxAttempts} attempts**.\nType your guess in chat!`)
        .setColor(0x3498DB).setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = (m) => m.author.id === interaction.user.id && !isNaN(m.content) && parseInt(m.content) >= 1 && parseInt(m.content) <= 100;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60_000, max: maxAttempts });

    collector.on('collect', (msg) => {
        attempts++;
        const guess = parseInt(msg.content);

        if (guess === target) {
            const winEmbed = new EmbedBuilder()
                .setTitle('🎉  You Got It!')
                .setDescription(`The number was **${target}**!\n\n🏆 You guessed it in **${attempts}** attempt${attempts !== 1 ? 's' : ''}!`)
                .setColor(0x2ECC71).setTimestamp();
            msg.reply({ embeds: [winEmbed] });
            collector.stop('won');
        } else if (attempts >= maxAttempts) {
            const loseEmbed = new EmbedBuilder()
                .setTitle('💀  Game Over!')
                .setDescription(`The number was **${target}**.\n\nYou used all **${maxAttempts}** attempts.`)
                .setColor(0xE74C3C).setTimestamp();
            msg.reply({ embeds: [loseEmbed] });
            collector.stop('lost');
        } else {
            const hint = guess > target ? '📉 **Lower!**' : '📈 **Higher!**';
            const remaining = maxAttempts - attempts;
            msg.reply(`${hint} (${remaining} attempt${remaining !== 1 ? 's' : ''} left)`);
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            interaction.followUp({ embeds: [new EmbedBuilder().setTitle('⏰  Time\'s Up!').setDescription(`The number was **${target}**.`).setColor(0x95A5A6)] });
        }
    });
}

// ─── Would You Rather ────────────────────────────────────────────

async function handleWYR(interaction) {
    const wyr = WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)];
    const uid = Date.now().toString(36);

    const embed = new EmbedBuilder()
        .setTitle('🤔  Would You Rather?')
        .setDescription(`**🅰️** ${wyr[0]}\n\n**OR**\n\n**🅱️** ${wyr[1]}`)
        .setColor(0x9B59B6).setFooter({ text: 'Vote by clicking a button!' }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`wyr_a_${uid}`).setLabel('A').setEmoji('🅰️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`wyr_b_${uid}`).setLabel('B').setEmoji('🅱️').setStyle(ButtonStyle.Danger),
    );

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const votes = { a: 0, b: 0 };
    const voters = new Set();

    const collector = reply.createMessageComponentCollector({ filter: (i) => i.customId.endsWith(uid), time: 30_000 });

    collector.on('collect', async (i) => {
        if (voters.has(i.user.id)) {
            return i.reply({ content: "You've already voted!", ephemeral: true });
        }
        voters.add(i.user.id);
        const choice = i.customId.startsWith('wyr_a') ? 'a' : 'b';
        votes[choice]++;
        await i.reply({ content: `✅ You chose **${choice === 'a' ? 'A' : 'B'}**!`, ephemeral: true });
    });

    collector.on('end', async () => {
        const total = votes.a + votes.b;
        const pctA = total > 0 ? Math.round((votes.a / total) * 100) : 0;
        const pctB = total > 0 ? Math.round((votes.b / total) * 100) : 0;

        const resultEmbed = new EmbedBuilder()
            .setTitle('🤔  Would You Rather — Results')
            .setDescription(`**🅰️** ${wyr[0]} — **${pctA}%** (${votes.a} votes)\n\n**🅱️** ${wyr[1]} — **${pctB}%** (${votes.b} votes)\n\n📊 Total votes: **${total}**`)
            .setColor(0x9B59B6).setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`wyr_a_${uid}`).setLabel(`A (${votes.a})`).setEmoji('🅰️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId(`wyr_b_${uid}`).setLabel(`B (${votes.b})`).setEmoji('🅱️').setStyle(ButtonStyle.Danger).setDisabled(true),
        );

        await reply.edit({ embeds: [resultEmbed], components: [disabledRow] }).catch(() => { });
    });
}

// ─── Word Scramble ───────────────────────────────────────────────

async function handleScramble(interaction) {
    const wordData = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
    const scrambled = wordData.word.split('').sort(() => Math.random() - 0.5).join('');

    const embed = new EmbedBuilder()
        .setTitle('🔤  Word Scramble!')
        .setDescription(`Unscramble this word:\n\n## \`${scrambled}\`\n\n💡 Hint: *${wordData.hint}*\n\n⏰ You have **30 seconds**! Type your answer.`)
        .setColor(0xE67E22).setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = (m) => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30_000 });

    collector.on('collect', (msg) => {
        if (msg.content.toUpperCase() === wordData.word) {
            msg.reply({ embeds: [new EmbedBuilder().setTitle('🎉  Correct!').setDescription(`The word was **${wordData.word}**! Great job!`).setColor(0x2ECC71)] });
            collector.stop('won');
        } else {
            msg.reply('❌ Not quite! Try again...').catch(() => { });
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            interaction.followUp({ embeds: [new EmbedBuilder().setTitle("⏰  Time's Up!").setDescription(`The word was **${wordData.word}**.`).setColor(0x95A5A6)] });
        }
    });
}

// ─── Blackjack ───────────────────────────────────────────────────

function drawCard() {
    const suit = CARD_SUITS[Math.floor(Math.random() * 4)];
    const value = CARD_VALUES[Math.floor(Math.random() * 13)];
    return { suit, value, display: `${value}${suit}` };
}

function handValue(hand) {
    let total = 0, aces = 0;
    for (const card of hand) {
        if (card.value === 'A') { total += 11; aces++; }
        else if (['K', 'Q', 'J'].includes(card.value)) total += 10;
        else total += parseInt(card.value);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function handString(hand) { return hand.map(c => `\`${c.display}\``).join(' '); }

async function handleBlackjack(interaction) {
    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];
    const uid = Date.now().toString(36);

    function buildEmbed(showDealer = false) {
        const playerVal = handValue(playerHand);
        const dealerVal = showDealer ? handValue(dealerHand) : '?';
        const dealerCards = showDealer ? handString(dealerHand) : `${dealerHand[0].display} \`??\``;

        return new EmbedBuilder()
            .setTitle('🃏  Blackjack')
            .setDescription([
                `**Dealer's Hand** (${dealerVal})`, dealerCards, '',
                `**Your Hand** (${playerVal})`, handString(playerHand),
            ].join('\n'))
            .setColor(playerVal > 21 ? 0xE74C3C : 0x2ECC71).setTimestamp();
    }

    // Check for natural blackjack
    if (handValue(playerHand) === 21) {
        const embed = buildEmbed(true).setTitle('🃏  Blackjack — 🎉 BLACKJACK!').setDescription(buildEmbed(true).data.description + '\n\n🏆 **Natural Blackjack! You win!**');
        return interaction.reply({ embeds: [embed] });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('Stand').setEmoji('🛑').setStyle(ButtonStyle.Danger),
    );

    const reply = await interaction.reply({ embeds: [buildEmbed()], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id && i.customId.endsWith(uid), time: 60_000 });

    collector.on('collect', async (i) => {
        if (i.customId.startsWith('bj_hit')) {
            playerHand.push(drawCard());
            if (handValue(playerHand) > 21) {
                const bustEmbed = buildEmbed(true).setTitle('🃏  Blackjack — 💥 BUST!').setColor(0xE74C3C);
                bustEmbed.setDescription(bustEmbed.data.description + '\n\n💥 **Bust! You went over 21. Dealer wins!**');
                await i.update({ embeds: [bustEmbed], components: [] });
                collector.stop();
            } else if (handValue(playerHand) === 21) {
                // Auto-stand at 21
                collector.stop('stand');
                await finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed);
            } else {
                await i.update({ embeds: [buildEmbed()], components: [row] });
            }
        } else if (i.customId.startsWith('bj_stand')) {
            collector.stop('stand');
            await finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed);
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            reply.edit({ embeds: [buildEmbed(true).setTitle('🃏  Blackjack — ⏰ Timed Out')], components: [] }).catch(() => { });
        }
    });
}

async function finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed) {
    // Dealer draws until 17
    while (handValue(dealerHand) < 17) dealerHand.push(drawCard());

    const playerVal = handValue(playerHand);
    const dealerVal = handValue(dealerHand);

    let result, color;
    if (dealerVal > 21) { result = '🎉 **Dealer busts! You win!**'; color = 0x2ECC71; }
    else if (playerVal > dealerVal) { result = '🎉 **You win!**'; color = 0x2ECC71; }
    else if (playerVal < dealerVal) { result = '😔 **Dealer wins!**'; color = 0xE74C3C; }
    else { result = "🤝 **It's a push (tie)!**"; color = 0xF39C12; }

    const finalEmbed = buildEmbed(true);
    finalEmbed.setDescription(finalEmbed.data.description + `\n\n${result}`).setColor(color);
    await i.update({ embeds: [finalEmbed], components: [] });
}

// ─── Tic-Tac-Toe ─────────────────────────────────────────────────

async function handleTicTacToe(interaction) {
    const opponent = interaction.options.getUser('opponent');
    const isBot = !opponent || opponent.id === interaction.user.id || opponent.bot;
    const playerX = interaction.user;
    const playerO = isBot ? interaction.client.user : opponent;
    const uid = Date.now().toString(36);

    const board = Array(9).fill(null); // null, 'X', 'O'
    let currentTurn = 'X'; // X goes first

    function buildBoard() {
        const emojis = { X: '❌', O: '⭕', null: '⬛' };
        const rows = [];
        for (let r = 0; r < 3; r++) {
            const row = new ActionRowBuilder();
            for (let c = 0; c < 3; c++) {
                const idx = r * 3 + c;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ttt_${idx}_${uid}`)
                        .setLabel(board[idx] ? ' ' : `${idx + 1}`)
                        .setEmoji(board[idx] ? emojis[board[idx]] : undefined)
                        .setStyle(board[idx] === 'X' ? ButtonStyle.Danger : board[idx] === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(board[idx] !== null)
                );
            }
            rows.push(row);
        }
        return rows;
    }

    function checkWinner() {
        const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return board.every(cell => cell !== null) ? 'draw' : null;
    }

    function botMove() {
        // Simple AI: try center, then corners, then edges
        const empty = board.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
        if (empty.includes(4)) return 4;
        const corners = [0, 2, 6, 8].filter(i => empty.includes(i));
        if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
        return empty[Math.floor(Math.random() * empty.length)];
    }

    const turnPlayer = () => currentTurn === 'X' ? playerX : playerO;

    const embed = new EmbedBuilder()
        .setTitle('❌⭕  Tic-Tac-Toe')
        .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\nIt's ${turnPlayer().username}'s turn! (${currentTurn === 'X' ? '❌' : '⭕'})`)
        .setColor(0x3498DB).setTimestamp();

    const reply = await interaction.reply({ embeds: [embed], components: buildBoard(), fetchReply: true });

    const collector = reply.createMessageComponentCollector({
        filter: (i) => i.customId.endsWith(uid) && (i.user.id === playerX.id || (!isBot && i.user.id === playerO.id)),
        time: 120_000,
    });

    collector.on('collect', async (i) => {
        // Check it's the right player's turn
        if ((currentTurn === 'X' && i.user.id !== playerX.id) || (currentTurn === 'O' && i.user.id !== playerO.id)) {
            return i.reply({ content: "It's not your turn!", ephemeral: true });
        }

        const idx = parseInt(i.customId.split('_')[1]);
        if (board[idx] !== null) return i.reply({ content: 'That spot is taken!', ephemeral: true });

        board[idx] = currentTurn;
        let winner = checkWinner();

        if (!winner && isBot && currentTurn === 'X') {
            currentTurn = 'O';
            const botIdx = botMove();
            board[botIdx] = 'O';
            winner = checkWinner();
            currentTurn = 'X';
        } else {
            currentTurn = currentTurn === 'X' ? 'O' : 'X';
        }

        if (winner) {
            let resultText;
            if (winner === 'draw') resultText = "🤝 **It's a draw!**";
            else resultText = `🏆 **${winner === 'X' ? playerX.username : playerO.username} wins!** (${winner === 'X' ? '❌' : '⭕'})`;

            const finalEmbed = new EmbedBuilder()
                .setTitle('❌⭕  Tic-Tac-Toe — Game Over')
                .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\n${resultText}`)
                .setColor(winner === 'draw' ? 0xF39C12 : 0x2ECC71).setTimestamp();

            // Disable all buttons
            const disabledBoard = buildBoard().map(row => {
                row.components.forEach(btn => btn.setDisabled(true));
                return row;
            });

            await i.update({ embeds: [finalEmbed], components: disabledBoard });
            collector.stop();
        } else {
            const turnEmbed = new EmbedBuilder()
                .setTitle('❌⭕  Tic-Tac-Toe')
                .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\nIt's ${turnPlayer().username}'s turn! (${currentTurn === 'X' ? '❌' : '⭕'})`)
                .setColor(0x3498DB).setTimestamp();

            await i.update({ embeds: [turnEmbed], components: buildBoard() });
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            reply.edit({ embeds: [new EmbedBuilder().setTitle('❌⭕  Tic-Tac-Toe — ⏰ Timed Out').setColor(0x95A5A6)], components: [] }).catch(() => { });
        }
    });
}

// ─── Slots ───────────────────────────────────────────────────────

async function handleSlots(interaction) {
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

    const multiplierMap = { '7️⃣': '🏆 JACKPOT! x100', '💎': '💎 x50', '⭐': '⭐ x25', '🍉': 'x10', '🍊': 'x5', '🍋': 'x3', '🍒': 'x2' };

    let result, color;
    if (allMatch) {
        result = `🎰 **THREE ${r2[0]}!** ${multiplierMap[r2[0]] || 'Big Win!'}`;
        color = r2[0] === '7️⃣' ? 0xFFD700 : 0x2ECC71;
    } else if (twoMatch) {
        result = '🎰 **Two matching!** Small win!';
        color = 0xF39C12;
    } else {
        result = '🎰 No match. Try again!';
        color = 0x95A5A6;
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

    return interaction.reply({ embeds: [embed] });
}

// ─── Reaction Speed Test ─────────────────────────────────────────

async function handleReaction(interaction) {
    const uid = Date.now().toString(36);
    const waitTime = Math.floor(Math.random() * 4000) + 2000; // 2-6 seconds

    const waitEmbed = new EmbedBuilder()
        .setTitle('⚡  Reaction Speed Test')
        .setDescription('🔴 Wait for it...\n\nClick the button as soon as it turns **green**!')
        .setColor(0xE74C3C).setTimestamp();

    const waitRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`react_wait_${uid}`).setLabel('Wait...').setStyle(ButtonStyle.Danger).setDisabled(true)
    );

    const reply = await interaction.reply({ embeds: [waitEmbed], components: [waitRow], fetchReply: true });

    // Check if someone clicked too early (shouldn't be possible since disabled, but just in case)
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const goEmbed = new EmbedBuilder()
        .setTitle('⚡  Reaction Speed Test')
        .setDescription('🟢 **NOW! CLICK IT!**')
        .setColor(0x2ECC71).setTimestamp();

    const goRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`react_go_${uid}`).setLabel('CLICK!').setEmoji('⚡').setStyle(ButtonStyle.Success)
    );

    const goTime = Date.now();
    await reply.edit({ embeds: [goEmbed], components: [goRow] });

    try {
        const collected = await reply.awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === `react_go_${uid}`,
            time: 10_000,
        });

        const reactionTime = Date.now() - goTime;
        let rating;
        if (reactionTime < 200) rating = '🏆 **INSANE!** Are you a robot?!';
        else if (reactionTime < 350) rating = '⚡ **Lightning fast!**';
        else if (reactionTime < 500) rating = '🔥 **Very fast!**';
        else if (reactionTime < 700) rating = '👍 **Pretty good!**';
        else if (reactionTime < 1000) rating = '😐 **Average**';
        else rating = '🐢 **A bit slow...**';

        const resultEmbed = new EmbedBuilder()
            .setTitle('⚡  Reaction Speed Test — Result')
            .setDescription(`⏱️ Your reaction time: **${reactionTime}ms**\n\n${rating}`)
            .setColor(reactionTime < 500 ? 0x2ECC71 : reactionTime < 1000 ? 0xF39C12 : 0xE74C3C).setTimestamp();

        await collected.update({ embeds: [resultEmbed], components: [] });
    } catch {
        await reply.edit({ embeds: [new EmbedBuilder().setTitle('⏰  Too Slow!').setDescription('You didn\'t click in time.').setColor(0x95A5A6)], components: [] }).catch(() => { });
    }
}

// ─── Word Chain ──────────────────────────────────────────────────

async function handleWordChain(interaction) {
    const chain = [];
    let lastLetter = null;
    let lastUserId = null;
    const usedWords = new Set();
    const players = new Set();
    let wordCount = 0;

    const embed = new EmbedBuilder()
        .setTitle('🔗  Word Chain!')
        .setDescription([
            '**Rules:**',
            '• Type a word that starts with the **last letter** of the previous word',
            '• No repeated words • Min 2 letters',
            '• No same user twice in a row • Anyone can play!',
            '', '🟢 **Type any word to start!**',
        ].join('\n'))
        .setColor(0x3498DB).setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = (m) => !m.author.bot && /^[a-zA-Z]{2,}$/.test(m.content.trim());
    const collector = interaction.channel.createMessageCollector({ filter });

    collector.on('collect', (msg) => {
        const word = msg.content.trim().toLowerCase();
        if (lastLetter && word[0] !== lastLetter) { msg.reply(`❌ Must start with **${lastLetter.toUpperCase()}**!`); return; }
        if (usedWords.has(word)) { msg.reply('❌ Already used!'); return; }
        if (lastUserId && msg.author.id === lastUserId) { msg.reply('❌ You can\'t go twice in a row! Let someone else answer.'); return; }

        usedWords.add(word);
        lastLetter = word[word.length - 1];
        lastUserId = msg.author.id;
        wordCount++;
        players.add(msg.author.id);
        chain.push({ word, user: msg.author.username });
        msg.react('✅').catch(() => { });
        collector.resetTimer({ idle: 15_000 });

        if (wordCount % 5 === 0) {
            const last5 = chain.slice(-5).map(c => `**${c.word}** (${c.user})`).join(' → ');
            msg.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`🔗 Chain: ${wordCount} words!`)
                    .setDescription(`${last5}\n\nNext letter: **${lastLetter.toUpperCase()}**`)
                    .setColor(0x2ECC71).setFooter({ text: '15s to answer!' })]
            });
        }
    });

    collector.on('end', () => {
        const lastWords = chain.slice(-10).map(c => `**${c.word}**`).join(' → ');
        const rating = wordCount >= 20 ? '🏆 **Amazing!**' : wordCount >= 10 ? '🔥 **Great!**' : wordCount >= 5 ? '👍 **Not bad!**' : '💪 **Try again!**';
        interaction.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('🔗  Word Chain — Game Over!')
                .setDescription(`⏰ No one answered in time!\n\n📊 **${wordCount}** words • **${players.size}** player(s)\n\n${wordCount > 0 ? `🔗 ${lastWords}\n\n` : ''}${rating}`)
                .setColor(0xF39C12).setTimestamp()]
        });
    });
}
