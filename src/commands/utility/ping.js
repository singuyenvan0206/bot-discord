const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'ping',
    aliases: ['p', 'pong'],
    description: 'Kiểm tra độ trễ và trạng thái hoạt động của bot',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const sent = await message.reply(t('ping.checking', lang));
        const roundtrip = sent.createdTimestamp - message.createdTimestamp;
        const heartbeat = message.client.ws.ping;
        const uptime = process.uptime();

        // Format uptime
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = t('ping.uptime_format', lang, { d: days, h: hours, m: minutes, s: seconds });

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
            .setTitle(t('ping.title', lang))
            .setDescription(`${latencyBar(roundtrip)}`)
            .addFields(
                { name: t('ping.roundtrip', lang), value: `\`${roundtrip}ms\``, inline: true },
                { name: t('ping.heartbeat', lang), value: `\`${heartbeat}ms\``, inline: true },
                { name: t('ping.uptime', lang), value: `\`${uptimeStr}\``, inline: true },
                { name: t('ping.memory', lang), value: `\`${memMB} MB\``, inline: true },
                { name: t('ping.servers', lang), value: `\`${message.client.guilds.cache.size}\``, inline: true },
                { name: t('ping.users', lang), value: `\`${message.client.users.cache.size}\``, inline: true },
                { name: t('ping.node', lang), value: `\`${process.version}\``, inline: true },
                { name: t('ping.djs', lang), value: `\`v${require('discord.js').version}\``, inline: true },
                { name: t('ping.platform', lang), value: `\`${process.platform}\``, inline: true },
            )
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: t('common.requested_by', lang, { user: message.author.tag }) });

        return sent.edit({ content: null, embeds: [embed] });
    }
};
