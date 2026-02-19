const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top'],
    description: 'Show the top 10 richest users in this server',
    async execute(message, args) {
        // Fetch top 100 users globally to increase chance of finding local members
        const topUsers = db.getTopUsers(100, 'balance');

        const guildMembers = [];

        // Filter for local guild members
        for (const u of topUsers) {
            if (guildMembers.length >= 10) break;

            try {
                // Check cache first
                let member = message.guild.members.cache.get(u.id);
                if (!member) {
                    // Try fetching
                    member = await message.guild.members.fetch(u.id).catch(() => null);
                }

                if (member) {
                    guildMembers.push({ username: member.user.username, balance: u.balance });
                }
            } catch (e) {
                // User might have left or isn't fetchable
            }
        }

        const lines = guildMembers.map((u, i) => {
            return `**${i + 1}.** ${u.username} — 💰 **${u.balance.toLocaleString()}**`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`🏆  Richest Users in ${message.guild.name}`)
            .setDescription(lines.join('\n') || 'No data found in this server.')
            .setColor(0xF1C40F)
            .setFooter({ text: 'Global Wealth, Local Rank' });

        return message.reply({ embeds: [embed] });
    }
};
