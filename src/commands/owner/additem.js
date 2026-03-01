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
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) return message.reply(t('common.error', lang));

        const itemQuery = args.slice(1).join(' ').toLowerCase();
        let amount = 1;

        // Try to find if last arg is a number (amount)
        const lastArg = args[args.length - 1];
        if (args.length > 2 && /^\d+$/.test(lastArg)) {
            amount = parseInt(lastArg);
            // Re-evaluate itemQuery without the amount
            const queryWithoutAmount = args.slice(1, -1).join(' ').toLowerCase();
            if (queryWithoutAmount) {
                const item = shopItems.find(i =>
                    String(i.id) === queryWithoutAmount ||
                    i.name.toLowerCase() === queryWithoutAmount ||
                    i.name.toLowerCase().replace(/\s+/g, '_') === queryWithoutAmount
                );
                if (item) {
                    await db.addItem(target.id, item.id, amount);
                    return message.reply(`✅ Đã thêm **${amount}** x **${item.name}** cho **${target.username}**.`);
                }
            }
        }

        // Standard lookup (ID or Name)
        const item = shopItems.find(i =>
            String(i.id) === itemQuery ||
            i.name.toLowerCase() === itemQuery ||
            i.name.toLowerCase().replace(/\s+/g, '_') === itemQuery
        );

        if (!item) return message.reply('❌ ID hoặc tên vật phẩm không hợp lệ.');

        await db.addItem(target.id, item.id, amount);

        return message.reply(`✅ Đã thêm **${amount}** x **${item.name}** cho **${target.username}**.`);
    }
};
