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

        // Collect all mentioned users
        let targets = Array.from(message.mentions.users.values());

        // If no mentions, try ID in first argument
        if (targets.length === 0 && args[0]) {
            const target = await message.client.users.fetch(args[0]).catch(() => null);
            if (target) targets.push(target);
        }

        if (targets.length === 0) return message.reply(lang === 'vi' ? '❌ Vui lòng nhập ID hoặc ping người dùng.' : '❌ Please provide the ID or ping the user.');

        const level = parseInt(args[args.length - 1]);
        if (isNaN(level) || level < 0) return message.reply(lang === 'vi' ? '❌ Vui lòng nhập số hợp lệ.' : '❌ Please provide a valid amount.');

        // XP = (Level / 0.1)^2
        const minXp = Math.floor(Math.pow(level / 0.1, 2));
        const { assignJobIfEligible } = require('../../utils/leveling');

        let results = [];

        for (const target of targets) {
            await db.updateUser(target.id, { level: level, xp: minXp });

            // Trigger job assignment if eligible
            const member = message.guild.members.cache.get(target.id) || await message.guild.members.fetch(target.id).catch(() => target);
            const assignedJob = await assignJobIfEligible(member, message.guild.id, level);

            results.push({ target, assignedJob });
        }

        let response = `✅ Đã đặt cấp độ của ${results.map(r => `**${r.target.username}**`).join(', ')} thành **${level}** (XP: **${minXp.toLocaleString()}**).`;

        const jobAssignedResults = results.filter(r => r.assignedJob);
        if (jobAssignedResults.length > 0) {
            response += `\n💼 **Job Assigned:** ${jobAssignedResults.map(r => `**${r.assignedJob.name}** cho **${r.target.username}**`).join(', ')}!`;
        }

        return message.reply(response);
    }
};
