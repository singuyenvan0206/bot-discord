const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const { CATCHES } = require('../../utils/fishData');
const config = require('../../config');

const COLLECTIONS = [
    {
        id: 'junk',
        keys: ['old_boot', 'rusty_can', 'seaweed'],
        reward: 50000,
        icon: '🗑️'
    },
    {
        id: 'common',
        keys: ['goldfish', 'bluegill', 'tilapia', 'perch', 'sardine', 'carp', 'catfish', 'brook_trout', 'archerfish'],
        reward: 250000,
        icon: '🐟'
    },
    {
        id: 'rare',
        keys: ['betta', 'bass', 'eel', 'sockeye_salmon', 'pufferfish', 'clownfish', 'octopus', 'arowana', 'seahorse', 'stingray'],
        reward: 1000000,
        icon: '🦑'
    },
    {
        id: 'exotic',
        keys: ['sunfish', 'swordfish', 'dolphin', 'tuna', 'manta_ray', 'sturgeon', 'marlin', 'hammerhead', 'shark', 'alligator_gar', 'whale'],
        reward: 5000000,
        icon: '🦈'
    },
    {
        id: 'legendary',
        keys: ['dragonfish', 'anglerfish', 'treasure_chest', 'phoenix_fish'],
        reward: 20000000,
        icon: '🔥'
    },
    {
        id: 'mythical',
        keys: ['mythical_pearl', 'kraken', 'megalodon', 'thousand_year_turtle', 'poseidon_trident', 'ocean_dragon', 'galaxy_whale', 'void_leviathan'],
        reward: 500000000,
        icon: '🌀'
    }
];

module.exports = {
    name: 'museum',
    aliases: ['bo suu tap', 'ledger', 'collection'],
    description: 'Bộ sưu tập cá (View your fish collection)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild?.id);

        let ledger = {};
        try { ledger = JSON.parse(user.fish_ledger || '{}'); } catch { ledger = {}; }

        // Handle collection completion check
        if (args[0] === 'claim') {
            const setId = args[1]?.toLowerCase();
            const collection = COLLECTIONS.find(c => c.id === setId);

            if (!collection) {
                return message.reply(t('museum.invalid_set', lang));
            }

            // Check if all fish in set are caught
            const missing = collection.keys.filter(key => !ledger[key]);
            if (missing.length > 0) {
                return message.reply(t('museum.missing_fish', lang, { count: missing.length }));
            }

            // Check if already claimed (stored in user metadata or just count balance?)
            // For simplicity, let's use a "claimed_collections" in user metadata
            let meta = {};
            try { meta = JSON.parse(user.server_data || '{}'); } catch { meta = {}; }
            if (!meta.claimed_museum) meta.claimed_museum = [];

            if (meta.claimed_museum.includes(setId)) {
                return message.reply(t('museum.already_claimed', lang));
            }

            // Success
            meta.claimed_museum.push(setId);
            await db.addBalance(message.author.id, collection.reward);
            await db.updateUser(message.author.id, { server_data: JSON.stringify(meta) });

            const setName = t(`museum.set_${setId}`, lang);
            return message.reply(t('museum.claim_success', lang, { set: setName, amount: collection.reward.toLocaleString(), emoji: config.EMOJIS.COIN }));
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏛️ ${t('museum.title', lang)} — ${message.author.username}`)
            .setColor(config.COLORS.INFO)
            .setDescription(t('museum.description', lang))
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

        let meta = {};
        try { meta = JSON.parse(user.server_data || '{}'); } catch { meta = {}; }
        const claimedSet = meta.claimed_museum || [];

        COLLECTIONS.forEach(set => {
            const setName = t(`museum.set_${set.id}`, lang);
            const caughtInSet = set.keys.filter(key => ledger[key]).length;
            const totalInSet = set.keys.length;
            const isCompleted = caughtInSet === totalInSet;
            const isClaimed = claimedSet.includes(set.id);

            let statusStr = `📊 progres: \`${caughtInSet}/${totalInSet}\``;
            if (isClaimed) {
                statusStr = `✅ **${t('museum.claimed', lang)}**`;
            } else if (isCompleted) {
                statusStr = `✨ **${t('museum.completed_ready', lang)}** (\`$museum claim ${set.id}\`)`;
            }

            // Preview some fish in set
            const preview = set.keys.map(k => {
                const fish = CATCHES.find(c => c.key === k);
                return ledger[k] ? (fish?.emoji || '🐟') : '❓';
            }).join(' ');

            embed.addFields({
                name: `${set.icon} ${setName}`,
                value: `${preview}\n${statusStr}\n💰 ${t('museum.reward', lang)}: \`${set.reward.toLocaleString()}\``,
                inline: false
            });
        });

        embed.setFooter({ text: t('museum.footer', lang) });

        return message.reply({ embeds: [embed] });
    }
};
