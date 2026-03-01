const db = require('../../database');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'setexp',
    aliases: ['sexp','se'],
    description: 'Đặt điểm kinh nghiệm cho người dùng (Set XP for user)',
    ownerOnly: true,
    usage: '<@user> <amount>',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) return message.reply(lang === 'vi' ? '❌ Vui lòng nhập ID của người dùng.' : '❌ Please provide the ID of the user.');

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount < 0) return message.reply(lang === 'vi' ? '❌ Vui lòng nhập số hợp lệ.' : '❌ Please provide a valid amount.');

        const { calculateLevel, assignJobIfEligible } = require('../../utils/leveling');
        const newLevel = calculateLevel(amount);

        await db.updateUser(target.id, { xp: amount, level: newLevel });

        // Trigger job assignment if eligible
        const member = message.guild.members.cache.get(target.id) || await message.guild.members.fetch(target.id).catch(() => target);
        const assignedJob = assignJobIfEligible(member, message.guild.id, newLevel);

        let response = `✅ Đã đặt XP của **${target.username}** thành **${amount.toLocaleString()}** (Cấp độ: **${newLevel}**).`;
        if (assignedJob) {
            response += `\n💼 **Job Assigned:** **${assignedJob.name}** đã được gán cho người dùng này!`;
        }

        return message.reply(response);
    }
};
