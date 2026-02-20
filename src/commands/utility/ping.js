const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    name: 'ping',
    aliases: ['p', 'pong'],
    description: 'Kiểm tra độ trễ và trạng thái hoạt động của bot',
    async execute(message, args) {
        const sent = await message.reply('🏓 Đang kiểm tra tín hiệu...');
        const roundtrip = sent.createdTimestamp - message.createdTimestamp;
        const heartbeat = message.client.ws.ping;
        const uptime = process.uptime();

        // Format uptime
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${days}n ${hours}g ${minutes}p ${seconds}s`;

        // Memory usage
        const memUsage = process.memoryUsage();
        const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);

        // Latency color
        let color = config.COLORS.SUCCESS; // Green
        if (roundtrip > 200) color = config.COLORS.ERROR; // Red
        else if (roundtrip > 100) color = config.COLORS.WARNING; // Yellow

        // Latency bar
        const latencyBar = (ms) => {
            const filled = Math.min(Math.floor(ms / 20), 10);
            return '🟩'.repeat(Math.max(0, 5 - filled)) + '🟨'.repeat(Math.min(filled, 3)) + '🟥'.repeat(Math.max(0, filled - 3));
        };

        const embed = new EmbedBuilder()
            .setTitle('🏓  Pong!')
            .setDescription(`${latencyBar(roundtrip)}`)
            .addFields(
                { name: '📡 Độ trễ (Roundtrip)', value: `\`${roundtrip}ms\``, inline: true },
                { name: '💓 Nhịp tim (Heartbeat)', value: `\`${heartbeat}ms\``, inline: true },
                { name: '⏱️ Thời gian hoạt động', value: `\`${uptimeStr}\``, inline: true },
                { name: '🖥️ Bộ nhớ dùng', value: `\`${memMB} MB\``, inline: true },
                { name: '🌐 Máy chủ', value: `\`${message.client.guilds.cache.size}\``, inline: true },
                { name: '👥 Người dùng', value: `\`${message.client.users.cache.size}\``, inline: true },
                { name: '📦 Node.js', value: `\`${process.version}\``, inline: true },
                { name: '📚 Discord.js', value: `\`v${require('discord.js').version}\``, inline: true },
                { name: '💻 Nền tảng', value: `\`${process.platform}\``, inline: true },
            )
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: `Yêu cầu bởi ${message.author.tag}` });

        return sent.edit({ content: null, embeds: [embed] });
    }
};
