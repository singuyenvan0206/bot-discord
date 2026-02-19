const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Economy system commands')
        .addSubcommand(sub =>
            sub.setName('balance')
                .setDescription('Check your or another user\'s balance')
                .addUserOption(option => option.setName('user').setDescription('The user to check')))
        .addSubcommand(sub =>
            sub.setName('daily')
                .setDescription('Claim your daily reward'))
        .addSubcommand(sub =>
            sub.setName('work')
                .setDescription('Work to earn money'))
        .addSubcommand(sub =>
            sub.setName('transfer')
                .setDescription('Transfer money to another user')
                .addUserOption(option => option.setName('user').setDescription('User to transfer to').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('Amount to transfer').setRequired(true).setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('leaderboard')
                .setDescription('Show the top 10 richest users'))
        .addSubcommand(sub =>
            sub.setName('shop')
                .setDescription('View items for sale'))
        .addSubcommand(sub =>
            sub.setName('inventory')
                .setDescription('View your inventory'))
        .addSubcommand(sub =>
            sub.setName('buy')
                .setDescription('Buy an item from the shop')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('The item ID to buy')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = db.getUser(interaction.user.id);

        if (subcommand === 'balance') {
            const target = interaction.options.getUser('user') || interaction.user;
            const targetData = db.getUser(target.id);
            const embed = new EmbedBuilder()
                .setTitle(`💰  Balance: ${target.username}`)
                .setDescription(`💸 Cash: **${targetData.balance.toLocaleString()}** coins\n📊 Level: **${targetData.level}** (XP: ${targetData.xp})`)
                .setColor(0xF1C40F);
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'daily') {
            const now = Math.floor(Date.now() / 1000);
            const cooldown = 86400; // 24 hours
            if (now - user.last_daily < cooldown) {
                const remaining = (user.last_daily + cooldown) - now;
                const hours = Math.floor(remaining / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                return interaction.reply({ content: `⏳ You can claim your daily reward in **${hours}h ${minutes}m**.`, ephemeral: true });
            }

            const reward = 500;
            db.updateUser(interaction.user.id, { last_daily: now });
            db.addBalance(interaction.user.id, reward);
            return interaction.reply({ content: `✅ You claimed your daily reward of **${reward}** coins! 💰` });
        }

        if (subcommand === 'work') {
            const now = Math.floor(Date.now() / 1000);
            const cooldown = 3600; // 1 hour
            if (now - user.last_work < cooldown) {
                const remaining = (user.last_work + cooldown) - now;
                const minutes = Math.floor(remaining / 60);
                return interaction.reply({ content: `⏳ You need to rest! Work again in **${minutes}m**.`, ephemeral: true });
            }

            const jobs = ['Programmer', 'Builder', 'Waiter', 'Chef', 'Mechanic', 'Doctor', 'Artist'];
            const job = jobs[Math.floor(Math.random() * jobs.length)];
            const earnings = Math.floor(Math.random() * 200) + 100; // 100-300 coins

            db.updateUser(interaction.user.id, { last_work: now });
            db.addBalance(interaction.user.id, earnings);
            return interaction.reply({ content: `🔨 You worked as a **${job}** and earned **${earnings}** coins! 💰` });
        }

        if (subcommand === 'transfer') {
            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            if (targetUser.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot transfer money to yourself.', ephemeral: true });
            if (targetUser.bot) return interaction.reply({ content: '❌ You cannot transfer money to bots.', ephemeral: true });
            if (user.balance < amount) return interaction.reply({ content: `❌ You don't have enough money! You only have **${user.balance}** coins.`, ephemeral: true });

            db.removeBalance(interaction.user.id, amount);
            db.addBalance(targetUser.id, amount);

            return interaction.reply({ content: `✅ Successfully transferred **${amount}** coins to ${targetUser}! 💸` });
        }

        if (subcommand === 'leaderboard') {
            const topUsers = db.getTopUsers(10, 'balance');
            const lines = await Promise.all(topUsers.map(async (u, i) => {
                let username = 'Unknown';
                try {
                    const fetched = await interaction.client.users.fetch(u.id);
                    username = fetched.username;
                } catch { }
                return `**${i + 1}.** ${username} — 💰 **${u.balance.toLocaleString()}**`;
            }));

            const embed = new EmbedBuilder()
                .setTitle('🏆  Richest Users')
                .setDescription(lines.join('\n') || 'No data yet.')
                .setColor(0xF1C40F);
            return interaction.reply({ embeds: [embed] });
        }

        const SHOP_ITEMS = [
            { id: 'laptop', name: '💻 Laptop', price: 5000, description: 'High performance machine' },
            { id: 'phone', name: '📱 Phone', price: 1000, description: 'Stay connected' },
            { id: 'sword', name: '⚔️ Sword', price: 1500, description: 'Sharp and dangerous' },
            { id: 'shield', name: '🛡️ Shield', price: 1000, description: 'Protects you' },
            { id: 'fishing_rod', name: '🎣 Fishing Rod', price: 500, description: 'Catch some fish' },
            { id: 'cookies', name: '🍪 Cookies', price: 50, description: 'Tasty snack' }
        ];

        if (subcommand === 'shop') {
            const items = SHOP_ITEMS.map(i => `**${i.name}** — 💰 ${i.price}\n*${i.description}*\nID: \`${i.id}\``).join('\n\n');
            const embed = new EmbedBuilder()
                .setTitle('🛒  General Store')
                .setDescription(items)
                .setColor(0x9B59B6)
                .setFooter({ text: 'Use /buy <id> to purchase!' });
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'inventory') {
            const userData = db.getUser(interaction.user.id);
            const inv = JSON.parse(userData.inventory || '{}');
            const lines = Object.entries(inv).map(([id, count]) => {
                const item = SHOP_ITEMS.find(i => i.id === id);
                const name = item ? item.name : id; // Fallback if item removed from shop
                return `**${name}**: ${count}`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`🎒  Inventory: ${interaction.user.username}`)
                .setDescription(lines.length > 0 ? lines.join('\n') : '*Your inventory is empty.*')
                .setColor(0x3498DB);
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'buy') {
            const itemId = interaction.options.getString('item').toLowerCase();
            const item = SHOP_ITEMS.find(i => i.id === itemId);

            if (!item) return interaction.reply({ content: '❌ Item not found. Check `/shop` for IDs.', ephemeral: true });

            if (user.balance < item.price) {
                return interaction.reply({ content: `❌ You need **${item.price}** coins to buy **${item.name}**!`, ephemeral: true });
            }

            db.removeBalance(interaction.user.id, item.price);
            db.addItem(interaction.user.id, item.id);

            return interaction.reply({ content: `✅ You bought **${item.name}** for **${item.price}** coins! 🛍️` });
        }
    }
};
