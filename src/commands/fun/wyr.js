const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const QUESTIONS = [
    ["Be able to fly", "Be able to turn invisible"],
    ["Have infinite money", "Have infinite health"],
    ["Explore space", "Explore the deep ocean"],
    ["Talk to animals", "Speak every language"],
    ["Always be 10 minutes late", "Always be 20 minutes early"],
    ["Lose your phone", "Lose your wallet"],
    ["Live in a treehouse", "Live in a cave"],
    ["Be a famous actor", "Be a famous singer"],
    ["Never need sleep", "Never need to eat"],
    ["Control fire", "Control water"]
];

module.exports = {
    name: 'wyr',
    description: 'Would You Rather?',
    cooldown: 5,
    async execute(message, args) {
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const uid = Date.now().toString(36);

        const embed = new EmbedBuilder()
            .setTitle('🤔  Would You Rather?')
            .setDescription(`**Option A:** ${q[0]}\n**Option B:** ${q[1]}`)
            .setColor(0x9B59B6);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`wyr_0_${uid}`).setLabel('Option A').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`wyr_1_${uid}`).setLabel('Option B').setStyle(ButtonStyle.Danger)
        );

        const reply = await message.reply({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({ time: 60_000 });

        const votes = { 0: 0, 1: 0 };
        const voters = new Set();

        collector.on('collect', async i => {
            if (voters.has(i.user.id)) return i.reply({ content: '❌ You already voted!', ephemeral: true });

            voters.add(i.user.id);
            const choice = parseInt(i.customId.split('_')[1]);
            votes[choice]++;

            await i.reply({ content: `✅ You voted for **Option ${choice === 0 ? 'A' : 'B'}**!`, ephemeral: true });
        });

        collector.on('end', () => {
            const total = votes[0] + votes[1];
            const p0 = total ? Math.round((votes[0] / total) * 100) : 0;
            const p1 = total ? Math.round((votes[1] / total) * 100) : 0;

            const resultEmbed = new EmbedBuilder()
                .setTitle('🤔  Would You Rather? — Results')
                .setDescription(`**Option A:** ${q[0]} — **${p0}%** (${votes[0]})\n**Option B:** ${q[1]} — **${p1}%** (${votes[1]})`)
                .setColor(0x3498DB);

            reply.edit({ embeds: [resultEmbed], components: [] }).catch(() => { });
        });
    }
};
