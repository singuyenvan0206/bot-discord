const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const shopItems = require('../../utils/shopItems');

module.exports = {
    name: 'additem',
    aliases: ['ai'],
    description: 'Thêm vật phẩm cho người dùng (Add item to user)',
    ownerOnly: true,
    usage: '<@user> <item_id> [amount]',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);

        // Collect all mentioned users
        let targets = Array.from(message.mentions.users.values());

        // Find indices of mentions in args to skip them
        let mentionIndices = [];
        args.forEach((arg, index) => {
            if (arg.startsWith('<@') && arg.endsWith('>')) mentionIndices.push(index);
        });

        // Use the part of args that doesn't contain mentions for item and amount
        let remainingArgs = args.filter((arg, index) => !mentionIndices.includes(index));

        // If no mentions, use the first remaining arg as ID
        if (targets.length === 0 && remainingArgs[0]) {
            const target = await message.client.users.fetch(remainingArgs[0]).catch(() => null);
            if (target) {
                targets.push(target);
                remainingArgs.shift(); // Remove the ID from remaining args
            }
        }

        if (targets.length === 0) return message.reply(t('common.error', lang));
        if (remainingArgs.length === 0) return message.reply('❌ Vui lòng cung cấp ID hoặc tên vật phẩm.');

        let itemQuery = remainingArgs.join(' ').toLowerCase();
        let amount = 1;

        // Try to find if last arg is a number (amount)
        const lastArg = remainingArgs[remainingArgs.length - 1];
        if (remainingArgs.length > 1 && /^\d+$/.test(lastArg)) {
            amount = parseInt(lastArg);
            itemQuery = remainingArgs.slice(0, -1).join(' ').toLowerCase();
        }

        const item = shopItems.find(i =>
            String(i.id) === itemQuery ||
            i.name.toLowerCase() === itemQuery ||
            i.name.toLowerCase().replace(/\s+/g, '_') === itemQuery
        );

        if (!item) return message.reply('❌ ID hoặc tên vật phẩm không hợp lệ.');

        for (const target of targets) {
            await db.addItem(target.id, item.id, amount);
        }

        const userNames = targets.map(u => `**${u.username}**`).join(', ');
        const itemName = t(`items.${item.id}.name`, lang);
        return message.reply(`✅ Đã thêm **${amount.toLocaleString()}** x **${itemName}** cho: ${userNames}.`);
    }
};
