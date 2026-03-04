const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const { CATCHES } = require('../../utils/fishData');
const config = require('../../config');

module.exports = {
    name: 'aquarium',
    aliases: ['be ca', 'tank'],
    description: 'Bể cá ảo (Manage your virtual aquarium)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild?.id);

        let aquarium = {};
        try { aquarium = JSON.parse(user.aquarium_data || '{}'); } catch { aquarium = {}; }
        if (!aquarium.fish) aquarium.fish = [];

        // Logic choice
        const sub = args[0]?.toLowerCase();

        if (sub === 'add' || sub === 'tha') {
            const fishQuery = args.slice(1).join(' ').toLowerCase();
            if (!fishQuery) return message.reply(t('aquarium.add_usage', lang));

            // Check if user has this fish in Museum ledger
            let ledger = {};
            try { ledger = JSON.parse(user.fish_ledger || '{}'); } catch { ledger = {}; }

            const fish = CATCHES.find(f =>
                f.key === fishQuery ||
                (t(`fish.${f.key}`, lang) || '').toLowerCase().includes(fishQuery) ||
                f.key.replace('_', ' ').toLowerCase() === fishQuery
            );

            if (!fish || !ledger[fish.key]) {
                return message.reply(t('aquarium.not_in_museum', lang));
            }

            // Check tank capacity (max 5 fish for now)
            if (aquarium.fish.length >= 5) {
                return message.reply(t('aquarium.full', lang));
            }

            // Add to aquarium
            aquarium.fish.push({
                key: fish.key,
                addedAt: Math.floor(Date.now() / 1000)
            });

            await db.updateUser(message.guild.id, message.author.id, { aquarium_data: JSON.stringify(aquarium) });
            return message.reply(t('aquarium.add_success', lang, { emoji: fish.emoji, name: t(`fish.${fish.key}`, lang) || fish.key }));
        }

        if (sub === 'clear' || sub === 'don') {
            aquarium.fish = [];
            await db.updateUser(message.guild.id, message.author.id, { aquarium_data: JSON.stringify(aquarium) });
            return message.reply(t('aquarium.clear_success', lang));
        }

        // View Aquarium
        const embed = new EmbedBuilder()
            .setTitle(`🐠 ${t('aquarium.title', lang)} — ${message.author.username}`)
            .setColor(0x00A2E8)
            .setDescription(t('aquarium.description', lang))
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3062/3062283.png');

        if (aquarium.fish.length === 0) {
            embed.addFields({ name: t('aquarium.empty_title', lang), value: t('aquarium.empty_desc', lang) });
        } else {
            let passiveIncome = 0;
            const fishList = aquarium.fish.map(f => {
                const data = CATCHES.find(c => c.key === f.key);
                // Passive income check (High-rarity fish give more)
                // Common: 10/h, Rare: 100/h, Legendary: 1000/h, Mythical: 5000/h
                let reward = 10;
                if (data.value >= 10000000) reward = 5000;
                else if (data.value >= 500000) reward = 1000;
                else if (data.value >= 10000) reward = 100;

                passiveIncome += reward;
                return `${data.emoji} **${t(`fish.${f.key}`, lang) || f.key}** (+${reward}/h)`;
            }).join('\n');

            embed.addFields(
                { name: t('aquarium.fish_list', lang), value: fishList, inline: false },
                { name: `💰 ${t('aquarium.passive_title', lang)}`, value: `\`${passiveIncome.toLocaleString()}\` coins / hour`, inline: true }
            );
        }

        embed.setFooter({ text: t('aquarium.footer', lang) });
        return message.reply({ embeds: [embed] });
    }
};
