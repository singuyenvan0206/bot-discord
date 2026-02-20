const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

// Rod Definitions (Must match shopItems.js logic)
const RODS = [
    { id: '33', name: 'Cần Sợi Carbon', luck: 2.5 },
    { id: '26', name: 'Cần Sợi Thủy Tinh', luck: 1.5 },
    { id: '11', name: 'Cần Tre', luck: 1.0 } // Tier 1
];

// Bait Definitions
const BAITS = [
    { id: '4', name: 'Mồi Mực', luck: 0.8 },
    { id: '3', name: 'Mồi Dế', luck: 0.3 },
    { id: '2', name: 'Mồi Giun', luck: 0.1 }
];

// Fish Table
const CATCHES = [
    { name: 'Chiếc Ủng Cũ', emoji: '👢', value: 0, weight: 20, minLuck: 0 },
    { name: 'Vỏ Lon Gỉ', emoji: '🥫', value: 0, weight: 20, minLuck: 0 },
    { name: 'Rong Biển', emoji: '🌿', value: 5, weight: 15, minLuck: 0 },
    { name: 'Cá Mòi', emoji: '🐟', value: 30, weight: 20, minLuck: 0 },
    { name: 'Cá Hồi Suối', emoji: '🐟', value: 50, weight: 15, minLuck: 0 },
    { name: 'Cá Vược', emoji: '🐟', value: 75, weight: 10, minLuck: 1.0 },
    { name: 'Cá Hồi Đỏ', emoji: '🐟', value: 100, weight: 10, minLuck: 1.2 },
    { name: 'Cá Ngừ', emoji: '🐟', value: 250, weight: 8, minLuck: 1.5 },
    { name: 'Cá Nóc', emoji: '🐡', value: 150, weight: 12, minLuck: 1.0 },
    { name: 'Cá Hề', emoji: '🐠', value: 200, weight: 8, minLuck: 1.2 },
    { name: 'Cá Kiếm', emoji: '🗡️', value: 500, weight: 5, minLuck: 1.8 },
    { name: 'Cá Mập', emoji: '🦈', value: 1000, weight: 3, minLuck: 2.0 },
    { name: 'Cá Voi', emoji: '🐋', value: 2500, weight: 2, minLuck: 2.5 },
    { name: 'Rương Kho Báu', emoji: '💰', value: 5000, weight: 1, minLuck: 1.5 },
    { name: 'Quái Vật Kraken', emoji: '🐙', value: 10000, weight: 0.5, minLuck: 3.0 } // Requires Carbon Rod + Squid Bait
];

module.exports = {
    name: 'fish',
    aliases: ['fishing', 'cast'],
    description: 'Đi câu cá! Đòi hỏi phải có cần câu và mồi.',
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
            return message.reply(`${config.EMOJIS.ERROR} Bạn cần một cái **Cần câu** để đi câu! Hãy mua một cái trong cửa hàng (\`${config.PREFIX}buy 11\`).`);
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
            return message.reply(`${config.EMOJIS.ERROR} Bạn cần **Mồi câu** để đi câu! Hãy mua mồi trong cửa hàng (vđ: \`${config.PREFIX}buy 2\`).`);
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
                .setTitle(`${config.EMOJIS.FISH} Chuyến Câu Cá`)
                .setColor(config.COLORS.INFO)
                .setDescription(`Sử dụng **${rod.name}** và **${bait.name}**...`)
                .addFields(
                    { name: 'Đã bắt được', value: `${caughtItem.emoji} **${caughtItem.name}**`, inline: true },
                    { name: 'Thu nhập', value: `${config.EMOJIS.COIN} **+${caughtItem.value}**`, inline: true },
                    { name: 'May mắn', value: `✨ ${totalLuck.toFixed(1)}x`, inline: true }
                );

            if (bonus > 0) {
                embed.addFields({ name: 'Thưởng Item', value: `✨ +${bonus} (${Math.round(multiplier * 100)}%)`, inline: true });
            }

            embed.setFooter({ text: 'Mồi đã dùng: -1 ' + bait.name });

            message.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle(`${config.EMOJIS.FISH} Chuyến Câu Cá`)
                .setColor(config.COLORS.NEUTRAL)
                .setDescription(`Sử dụng **${rod.name}** và **${bait.name}**...`)
                .addFields(
                    { name: 'Đã bắt được', value: `${caughtItem.emoji} **${caughtItem.name}**`, inline: true },
                    { name: 'Thu nhập', value: `${config.EMOJIS.COIN} **0**`, inline: true }
                )
                .setFooter({ text: 'Chúc bạn may mắn lần sau! (-1 Mồi câu)' });

            message.reply({ embeds: [embed] });
        }

        startCooldown(message.client, 'fish', message.author.id);
    }
};
