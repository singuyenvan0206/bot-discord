const db = require('../../database');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'setlevel',
    aliases: ['slv'],
    description: 'Đặt cấp độ cho người dùng (Set level for user)',
    ownerOnly: true,
    usage: '<@user> <amount>',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) return message.reply(lang === 'vi' ? '❌ Vui lòng nhập ID của người dùng.' : '❌ Please provide the ID of the user.');

        const level = parseInt(args[1]);
        if (isNaN(level) || level < 0) return message.reply(lang === 'vi' ? '❌ Vui lòng nhập số hợp lệ.' : '❌ Please provide a valid amount.');

        // XP = (Level / 0.1)^2
        const minXp = Math.floor(Math.pow(level / 0.1, 2));

        await db.updateUser(target.id, { level: level, xp: minXp });

        // Trigger job assignment if eligible
        const { assignJobIfEligible } = require('../../utils/leveling');
        const member = message.guild.members.cache.get(target.id) || await message.guild.members.fetch(target.id).catch(() => target);
        const assignedJob = assignJobIfEligible(member, message.guild.id, level);

        let response = `✅ Đã đặt cấp độ của **${target.username}** thành **${level}** (XP: **${minXp.toLocaleString()}**).`;
        if (assignedJob) {
            response += `\n💼 **Job Assigned:** **${assignedJob.name}** đã được gán cho người dùng này!`;
        }

        return message.reply(response);
    }
};
