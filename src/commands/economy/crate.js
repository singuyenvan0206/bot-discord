const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { t } = require('../../utils/i18n');
const config = require('../../config');
const crateConfig = require('../../config/crates');
const shopItems = require('../../utils/shopItems');

module.exports = {
    name: 'crate',
    description: 'Lucky crate system',
    aliases: ['ruong', 'gacha', 'crate-open'],
    async execute(message, args, lang) {
        const sub = args[0] ? args[0].toLowerCase() : 'list';

        if (sub === 'list') {
            const embed = new EmbedBuilder()
                .setTitle(t('crate.list_title', lang))
                .setColor(config.COLORS.INFO)
                .setDescription('Buy crates in the shop or find them in activities!');

            Object.values(crateConfig.TYPES).forEach(c => {
                embed.addFields({
                    name: t('crate.list_item', lang, { icon: c.icon, name: c.name[lang], price: c.price.toLocaleString() }),
                    value: ' '
                });
            });

            return message.channel.send({ embeds: [embed] });
        }

        if (sub === 'open') {
            const crateId = args[1] ? args[1].toLowerCase() : null;
            if (!crateId || !crateConfig.TYPES[crateId]) {
                return message.reply(t('crate.open_usage', lang));
            }

            const user = await db.getUser(message.author.id);
            const inventory = JSON.parse(user.inventory || '{}');

            if (!inventory[crateId] || inventory[crateId] <= 0) {
                return message.reply(t('crate.open_error_none', lang, { name: crateConfig.TYPES[crateId].name[lang] }));
            }

            // Remove 1 crate
            await db.removeItem(message.author.id, crateId, 1);

            const msg = await message.reply(t('crate.open_loading', lang, { name: crateConfig.TYPES[crateId].name[lang] }));

            // Simulate "loading" for effect
            setTimeout(async () => {
                const lootTable = crateConfig.LOOT_TABLES[crateId];

                // Roll for loot
                let rewardText = '';
                const roll = Math.random();
                let cumulativeChance = 0;
                let finalReward = null;

                // Sort loot to ensure consistent rolling
                const sortedLoot = [...lootTable].sort((a, b) => a.chance - b.chance);

                // Simple weighted random
                const totalWeight = lootTable.reduce((acc, curr) => acc + curr.chance, 0);
                let random = Math.random() * totalWeight;

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
                    .setTitle(t('crate.open_success', lang, { name: crateConfig.TYPES[crateId].name[lang] }))
                    .setDescription(rewardText)
                    .setColor(crateConfig.TYPES[crateId].color)
                    .setThumbnail('https://i.imgur.com/8E8Lh5D.png'); // Placeholder for crate open animation or static image

                await msg.edit({ content: ' ', embeds: [embed] });
            }, 2000);
        }
    }
};
