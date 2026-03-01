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
            const count = parseInt(args[2]) || 1;

            if (isNaN(count) || count <= 0) {
                return message.reply('❌ Invalid count!');
            }

            const LIMIT = 100;
            if (count > LIMIT) {
                return message.reply(t('crate.open_limit_error', lang, { limit: LIMIT }));
            }

            const user = await db.getUser(message.author.id);
            const inventory = JSON.parse(user.inventory || '{}');

            if (!inventory[crateId] || inventory[crateId] < count) {
                return message.reply(t('crate.open_error_none', lang, { name: crate.name[lang] }));
            }

            // Remove crates
            await db.removeItem(message.author.id, crateId, count);

            const msg = await message.reply(count > 1
                ? t('crate.open_loading', lang, { name: `${count}x ${crate.name[lang]}` })
                : t('crate.open_loading', lang, { name: crate.name[lang] })
            );

            // Simulate "loading" for effect
            setTimeout(async () => {
                const lootTable = crateConfig.LOOT_TABLES[crateId];
                const totalRewards = {
                    coins: 0,
                    items: {}
                };

                for (let i = 0; i < count; i++) {
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

                    if (!finalReward) finalReward = lootTable[lootTable.length - 1];

                    if (finalReward.coins) {
                        const [min, max] = finalReward.coins;
                        const amount = Math.floor(Math.random() * (max - min + 1)) + min;
                        totalRewards.coins += amount;
                    } else if (finalReward.item) {
                        const itemCount = finalReward.count || 1;
                        totalRewards.items[finalReward.item] = (totalRewards.items[finalReward.item] || 0) + itemCount;
                    }
                }

                // Apply rewards
                if (totalRewards.coins > 0) {
                    await db.addBalance(message.author.id, totalRewards.coins);
                }

                for (const [itemId, itemCount] of Object.entries(totalRewards.items)) {
                    await db.addItem(message.author.id, itemId, itemCount);
                }

                // Construct reward text
                let rewardText = '';
                if (totalRewards.coins > 0) {
                    rewardText += t('crate.reward_coins', lang, { amount: totalRewards.coins.toLocaleString() }) + '\n';
                }

                for (const [itemId, itemCount] of Object.entries(totalRewards.items)) {
                    const itemObj = shopItems.find(i => i.id.toString() === itemId.toString());
                    const itemName = itemObj ? itemObj.name : itemId;
                    rewardText += t('crate.reward_item', lang, { count: itemCount, item: itemName }) + '\n';
                }

                const embed = new EmbedBuilder()
                    .setTitle(count > 1
                        ? t('crate.open_bulk_success', lang, { count, name: crate.name[lang] })
                        : t('crate.open_success', lang, { name: crate.name[lang] })
                    )
                    .setDescription(rewardText || 'Nothing...')
                    .setColor(crate.color)
                    .setThumbnail('https://i.imgur.com/8E8Lh5D.png');

                if (count > 1) {
                    embed.setFooter({ text: t('crate.total_loot', lang) });
                }

                await msg.edit({ content: ' ', embeds: [embed] });
            }, 2000);
        }
    }
};
