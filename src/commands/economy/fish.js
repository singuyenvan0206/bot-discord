const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

// Rod Definitions (Must match shopItems.js logic)
const RODS = [
    { id: '33', name: 'Carbon Fiber Rod', luck: 2.5 },
    { id: '26', name: 'Fiberglass Rod', luck: 1.5 },
    { id: '11', name: 'Bamboo Rod', luck: 1.0 } // Tier 1
];

// Bait Definitions
const BAITS = [
    { id: '4', name: 'Squid Bait', luck: 0.8 },
    { id: '3', name: 'Cricket Bait', luck: 0.3 },
    { id: '2', name: 'Worm Bait', luck: 0.1 }
];

// Fish Table
const CATCHES = [
    { name: 'Old Boot', emoji: '👢', value: 0, weight: 20, minLuck: 0 },
    { name: 'Tin Can', emoji: '🥫', value: 0, weight: 20, minLuck: 0 },
    { name: 'Seaweed', emoji: '🌿', value: 5, weight: 15, minLuck: 0 },
    { name: 'Sardine', emoji: '🐟', value: 30, weight: 20, minLuck: 0 },
    { name: 'Trout', emoji: '🐟', value: 50, weight: 15, minLuck: 0 },
    { name: 'Bass', emoji: '🐟', value: 75, weight: 10, minLuck: 1.0 },
    { name: 'Salmon', emoji: '🐟', value: 100, weight: 10, minLuck: 1.2 },
    { name: 'Tuna', emoji: '🐟', value: 250, weight: 8, minLuck: 1.5 },
    { name: 'Pufferfish', emoji: '🐡', value: 150, weight: 12, minLuck: 1.0 },
    { name: 'Clownfish', emoji: '🐠', value: 200, weight: 8, minLuck: 1.2 },
    { name: 'Swordfish', emoji: '🗡️', value: 500, weight: 5, minLuck: 1.8 },
    { name: 'Shark', emoji: '🦈', value: 1000, weight: 3, minLuck: 2.0 },
    { name: 'Whale', emoji: '🐋', value: 2500, weight: 2, minLuck: 2.5 },
    { name: 'Treasure Chest', emoji: '💰', value: 5000, weight: 1, minLuck: 1.5 },
    { name: 'Kraken', emoji: '🐙', value: 10000, weight: 0.5, minLuck: 3.0 } // Requires Carbon Rod + Squid Bait
];

module.exports = {
    name: 'fish',
    aliases: ['fishing', 'cast'],
    description: 'Go fishing! Requires a rod and bait.',
    cooldown: 60,
    async execute(message, args) {
        const user = db.getUser(message.author.id);
        const inventory = JSON.parse(user.inventory || '{}');

        // 1. Check for Rod (Use Best)
        let rod = null;
        for (const r of RODS) {
            if (inventory[r.id]) {
                rod = r;
                break;
            }
        }

        if (!rod) {
            return message.reply(`${config.EMOJIS.ERROR} You need a **Fishing Rod** to fish! Buy one from the shop (\`${config.PREFIX}buy fishing_rod\`).`);
        }

        // 2. Check for Bait (Use Best)
        let bait = null;
        for (const b of BAITS) {
            if (inventory[b.id] && inventory[b.id] > 0) {
                bait = b;
                break;
            }
        }

        if (!bait) {
            return message.reply(`${config.EMOJIS.ERROR} You need **Bait** to fish! Buy some from the shop (e.g., \`${config.PREFIX}buy worm_bait\`).`);
        }

        // 3. Consume Bait
        db.removeItem(message.author.id, bait.id, 1);

        // 4. Calculate Total Luck
        const totalLuck = rod.luck + bait.luck;

        // 5. Determine Catch
        let pool = CATCHES.filter(c => c.minLuck <= totalLuck);

        let weightedPool = pool.map(c => {
            let modWeight = c.weight;
            if (totalLuck > 2.0 && c.value > 500) modWeight *= 2;
            if (totalLuck > 3.0 && c.value > 1000) modWeight *= 3;
            if (totalLuck > 2.0 && c.value === 0) modWeight *= 0.5;
            return { ...c, weight: modWeight };
        });

        // Weighted Random
        let totalWeight = 0;
        for (const c of weightedPool) totalWeight += c.weight;

        let random = Math.random() * totalWeight;
        let caughtItem = null;

        for (const c of weightedPool) {
            random -= c.weight;
            if (random <= 0) {
                caughtItem = c;
                break;
            }
        }
        if (!caughtItem) caughtItem = weightedPool[0];

        // 6. Respond
        if (caughtItem.value > 0) {
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(message.author.id, 'income');
            const bonus = Math.floor(caughtItem.value * multiplier);
            const totalValue = caughtItem.value + bonus;

            db.addBalance(message.author.id, totalValue);

            const embed = new EmbedBuilder()
                .setTitle(`${config.EMOJIS.FISH} Fishing Trip`)
                .setColor(config.COLORS.INFO)
                .setDescription(`Used **${rod.name}** and **${bait.name}**...`)
                .addFields(
                    { name: 'Caught', value: `${caughtItem.emoji} **${caughtItem.name}**`, inline: true },
                    { name: 'Earnings', value: `${config.EMOJIS.COIN} **+${caughtItem.value}**`, inline: true },
                    { name: 'Luck', value: `✨ ${totalLuck.toFixed(1)}x`, inline: true }
                );

            if (bonus > 0) {
                embed.addFields({ name: 'Item Bonus', value: `✨ +${bonus} (${Math.round(multiplier * 100)}%)`, inline: true });
            }

            embed.setFooter({ text: 'Bait consumed: -1 ' + bait.name });

            message.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle(`${config.EMOJIS.FISH} Fishing Trip`)
                .setColor(config.COLORS.NEUTRAL)
                .setDescription(`Used **${rod.name}** and **${bait.name}**...`)
                .addFields(
                    { name: 'Caught', value: `${caughtItem.emoji} **${caughtItem.name}**`, inline: true },
                    { name: 'Earnings', value: `${config.EMOJIS.COIN} **0**`, inline: true }
                )
                .setFooter({ text: 'Better luck next time! (-1 Bait)' });

            message.reply({ embeds: [embed] });
        }

        startCooldown(message.client, 'fish', message.author.id);
    }
};
