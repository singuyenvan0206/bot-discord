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

        const itemId = args[1];
        const amount = parseInt(args[2]) || 1;

        const item = shopItems.find(i => i.id === itemId);
        if (!item) return message.reply('❌ ID vật phẩm không hợp lệ.');

        await db.addItem(target.id, itemId, amount);

        return message.reply(`✅ Đã thêm **${amount}** x **${item.name}** cho **${target.username}**.`);
    }
};
