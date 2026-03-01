const db = require('../../database');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'serverlist',
    aliases: ['svl', 'guildlist', 'guilds'],
    description: 'Danh sách server bot đang tham gia (List all servers)',
    ownerOnly: true,
    async execute(message, args) {
        if (!await db.isOwner(message.author.id)) return;

        const lang = await getLanguage(message.author.id, message.guild?.id);

        const guilds = message.client.guilds.cache.map(guild => {
            return `**${guild.name}**\n\`ID: ${guild.id}\` | 👥 ${guild.memberCount} ${lang === 'vi' ? 'thành viên' : 'members'}`;
        });

        const totalMembers = message.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        // Pagination setup
        const MAX_PER_PAGE = 10;
        const totalPages = Math.ceil(guilds.length / MAX_PER_PAGE);
        let page = args[0] ? parseInt(args[0]) : 1;
        if (isNaN(page) || page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const start = (page - 1) * MAX_PER_PAGE;
        const end = start + MAX_PER_PAGE;
        const currentList = guilds.slice(start, end).join('\n\n') || (lang === 'vi' ? 'Không có dữ liệu.' : 'No data.');

        return message.reply(lang === 'vi' ? `Bot đang ở **${message.client.guilds.cache.size}** máy chủ với tổng cộng **${totalMembers.toLocaleString()}** thành viên.\n\n${currentList}` : `Bot is in **${message.client.guilds.cache.size}** servers with a total of **${totalMembers.toLocaleString()}** members.\n\n${currentList}`);

        message.reply({ embeds: [embed] });
    }
};
