const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const { CATCHES } = require('../../utils/fishData');
const config = require('../../config');
const path = require('path');
const { formatDuration } = require('../../utils/time');

const COLLECTIONS = [
    { id: 'junk', keys: ['old_boot', 'rusty_can', 'seaweed'], reward: 50000, icon: '🗑️' },
    { id: 'common', keys: ['goldfish', 'bluegill', 'tilapia', 'perch', 'sardine', 'carp', 'catfish', 'brook_trout', 'archerfish'], reward: 250000, icon: '🐟' },
    { id: 'rare', keys: ['betta', 'bass', 'eel', 'sockeye_salmon', 'pufferfish', 'clownfish', 'octopus', 'arowana', 'seahorse', 'stingray'], reward: 1000000, icon: '🦑' },
    { id: 'exotic', keys: ['sunfish', 'swordfish', 'dolphin', 'tuna', 'manta_ray', 'sturgeon', 'marlin', 'hammerhead', 'shark', 'alligator_gar', 'whale'], reward: 5000000, icon: '🦈' },
    { id: 'legendary', keys: ['dragonfish', 'anglerfish', 'treasure_chest', 'phoenix_fish'], reward: 20000000, icon: '🔥', gallery: true },
    { id: 'mythical', keys: ['mythical_pearl', 'kraken', 'megalodon', 'thousand_year_turtle', 'poseidon_trident', 'ocean_dragon', 'galaxy_whale', 'void_leviathan'], reward: 500000000, icon: '🌀', gallery: true }
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

            const missing = collection.keys.filter(key => !ledger[key]);
            if (missing.length > 0) {
                return message.reply(t('museum.missing_fish', lang, { count: missing.length }));
            }

            let meta = {};
            try { meta = JSON.parse(user.server_data || '{}'); } catch { meta = {}; }
            if (!meta.claimed_museum) meta.claimed_museum = [];

            if (meta.claimed_museum.includes(setId)) {
                return message.reply(t('museum.already_claimed', lang));
            }

            meta.claimed_museum.push(setId);
            await db.addBalance(message.guild.id, message.author.id, collection.reward);
            await db.updateUser(message.guild.id, message.author.id, { server_data: JSON.stringify(meta) });

            const setName = t(`museum.set_${setId}`, lang);
            return message.reply(t('museum.claim_success', lang, { set: setName, amount: collection.reward.toLocaleString(), emoji: config.EMOJIS.COIN }));
        }

        const generateOverview = () => {
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
                const isClaimed = claimedSet.includes(set.id);

                let statusStr = `📊 progres: \`${caughtInSet}/${totalInSet}\``;
                if (isClaimed) statusStr = `✅ **${t('museum.claimed', lang)}**`;
                else if (caughtInSet === totalInSet) statusStr = `✨ **${t('museum.completed_ready', lang)}** (\`$museum claim ${set.id}\`)`;

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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('museum_legendary').setLabel(t('museum.btn_legendary', lang)).setStyle(ButtonStyle.Primary).setEmoji('🔥'),
                new ButtonBuilder().setCustomId('museum_mythical').setLabel(t('museum.btn_mythical', lang)).setStyle(ButtonStyle.Primary).setEmoji('🌀')
            );

            return { embeds: [embed], components: [row] };
        };

        const generateGallery = (setId) => {
            const set = COLLECTIONS.find(c => c.id === setId);
            if (!set) return generateOverview();

            const embeds = [];
            const files = [];

            // Add Header Embed
            const headerEmbed = new EmbedBuilder()
                .setTitle(`🎨 ${t('museum.gallery_title', lang, { set: t(`museum.set_${setId}`, lang) })}`)
                .setColor(config.COLORS.INFO)
                .setDescription(t('museum.description', lang));
            embeds.push(headerEmbed);

            // Add fish embeds (limit to 9 to leave room for header)
            const fishKeys = set.keys.slice(0, 9);

            for (const key of fishKeys) {
                const fish = CATCHES.find(c => c.key === key);
                const ledgerData = ledger[key];
                const isCaught = !!ledgerData;

                const fishEmbed = new EmbedBuilder()
                    .setTitle(`${fish?.emoji || '🐟'} ${t(`fish.${key}`, lang)}`)
                    .setColor(isCaught ? config.COLORS.SUCCESS : config.COLORS.NEUTRAL);

                if (isCaught) {
                    const assetName = `${key}.png`;
                    const assetPath = path.join(process.cwd(), 'src', 'assets', 'fishing', assetName);

                    fishEmbed.addFields(
                        { name: t('museum.fish_info', lang, { value: fish.value.toLocaleString(), emoji: config.EMOJIS.COIN }), value: '\u200b', inline: true },
                        { name: t('museum.caught_at', lang, { time: `<t:${ledgerData.firstCaught}:R>` }), value: '\u200b', inline: true }
                    );

                    // Only attach if file exists
                    try {
                        fishEmbed.setImage(`attachment://${assetName}`);
                        files.push(assetPath);
                    } catch (e) { }

                } else {
                    fishEmbed.setDescription(t('museum.not_caught', lang));
                }

                embeds.push(fishEmbed);
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('museum_overview').setLabel(t('museum.btn_back', lang)).setStyle(ButtonStyle.Secondary)
            );

            return { embeds, components: [row], files };
        };

        const mainMsg = await message.reply(generateOverview());

        const collector = mainMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            if (i.customId === 'museum_overview') {
                await i.update(generateOverview());
            } else if (i.customId === 'museum_legendary') {
                await i.update(generateGallery('legendary'));
            } else if (i.customId === 'museum_mythical') {
                await i.update(generateGallery('mythical'));
            }
        });

        collector.on('end', () => {
            mainMsg.edit({ components: [] }).catch(() => { });
        });
    }
};
