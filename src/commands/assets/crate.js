const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const crateConfig = require('../../config/crates');
const shopItems = require('../../utils/shopItems');

module.exports = {
    name: 'crate',
    description: 'Lucky crate system',
    aliases: ['ruong', 'gacha', 'crate-open'],
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const sub = args[0] ? args[0].toLowerCase() : 'list';

        if (sub === 'list') {
            const embed = new EmbedBuilder()
                .setTitle(t('crate.list_title', lang))
                .setColor(config.COLORS.INFO)
                .setDescription('Buy crates in the shop or find them in activities!');

            Object.values(crateConfig.TYPES).forEach(c => {
                embed.addFields({
                    name: `${c.icon} ${c.name[lang]} (ID: \`${c.numeric_id}\`)`,
                    value: `💰 **${c.price.toLocaleString()}** coins`
                });
            });

            return message.channel.send({ embeds: [embed] });
        }

        if (sub === 'open') {
            const inputId = args[1] ? args[1].toLowerCase() : null;
            if (!inputId) {
                return message.reply(t('crate.open_usage', lang));
            }

            const crate = Object.values(crateConfig.TYPES).find(c =>
                c.id.toLowerCase() === inputId ||
                c.numeric_id.toString() === inputId
            );

            if (!crate) {
                return message.reply('❌ Crate ID not found!');
            }

            const crateId = crate.id;
            const user = await db.getUser(message.author.id);
            const inventory = JSON.parse(user.inventory || '{}');

            if (!inventory[crateId] || inventory[crateId] <= 0) {
                return message.reply(t('crate.open_error_none', lang, { name: crate.name[lang] }));
            }

            // Remove 1 crate
            await db.removeItem(message.author.id, crateId, 1);

            const msg = await message.reply(t('crate.open_loading', lang, { name: crate.name[lang] }));

            // Simulate "loading" for effect
            setTimeout(async () => {
                const lootTable = crateConfig.LOOT_TABLES[crateId];

                // Roll for loot
                let rewardText = '';
                const sortedLoot = [...lootTable].sort((a, b) => a.chance - b.chance);

                // Simple weighted random
                const totalWeight = lootTable.reduce((acc, curr) => acc + curr.chance, 0);
                let random = Math.random() * totalWeight;
                let finalReward = null;

                for (const loot of lootTable) {
                    if (random < loot.chance) {
                        finalReward = loot;
                        break;
                    }
                    random -= loot.chance;
                }

                // Fallback to last item if random logic misses
                if (!finalReward) finalReward = lootTable[lootTable.length - 1];

                if (finalReward.coins) {
                    const [min, max] = finalReward.coins;
                    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
                    await db.addBalance(message.author.id, amount);
                    rewardText = t('crate.reward_coins', lang, { amount: amount.toLocaleString() });
                } else if (finalReward.item) {
                    const count = finalReward.count || 1;
                    await db.addItem(message.author.id, finalReward.item, count);
                    const itemObj = shopItems.find(i => i.id.toString() === finalReward.item.toString());
                    const itemName = itemObj ? itemObj.name : finalReward.item;
                    rewardText = t('crate.reward_item', lang, { count, item: itemName });
                }

                const embed = new EmbedBuilder()
                    .setTitle(t('crate.open_success', lang, { name: crate.name[lang] }))
                    .setDescription(rewardText)
                    .setColor(crate.color)
                    .setThumbnail('https://i.imgur.com/8E8Lh5D.png');

                await msg.edit({ content: ' ', embeds: [embed] });
            }, 2000);
        }
    }
};
