const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'scramble',
    aliases: ['scram'],
    description: 'Sắp xếp lại từ đã bị xáo trộn',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        let word, category, hint;

        try {
            // Try fetching from Random Word API
            const response = await fetch('https://random-word-api.herokuapp.com/word?number=1');
            const data = await response.json();

            if (data && data.length > 0) {
                word = data[0];
                category = "Ngẫu nhiên";

                // Try fetching definition for hint
                try {
                    const defResponse = await fetch(`${config.API_URLS.DICTIONARY}${word}`);
                    const defData = await defResponse.json();

                    if (defData && defData.length > 0 && defData[0].meanings && defData[0].meanings.length > 0) {
                        const meaning = defData[0].meanings[0];
                        if (meaning.definitions && meaning.definitions.length > 0) {
                            category = "Định nghĩa";
                            hint = meaning.definitions[0].definition;
                        }
                    }
                } catch (e) {
                    console.error('Error fetching definition:', e);
                }
            }
        } catch (error) {
            console.error('Error fetching random word:', error);
        }

        if (!word) {
            return message.reply(`${config.EMOJIS.ERROR} Hiện không thể lấy được từ mới. Vui lòng thử lại sau.`);
        }

        const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');

        if (category === "Định nghĩa" && hint) {
            hint = `Định nghĩa: **${hint}**`;
        } else {
            hint = `Thể loại: **${category}**` + (Math.random() > 0.5 ? ` | Bắt đầu bằng: **${word[0].toUpperCase()}**` : ` | Độ dài: **${word.length}**`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🔠  Sắp Xếp Từ (Scramble)')
            .setDescription(`Hãy sắp xếp lại từ này: **${scrambled}**\n\n💡 **Gợi ý:** ${hint}`)
            .setColor(0xE67E22)
            .setFooter({ text: 'Bạn có 30 giây!' });

        await message.reply({ embeds: [embed] });

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => m.content.toLowerCase() === word && !m.author.bot,
                max: 1,
                time: 30_000,
                errors: ['time']
            });

            const winner = collected.first();
            const baseReward = config.ECONOMY.SCRAMBLE_REWARD;
            const { getUserMultiplier } = require('../../utils/multiplier');
            const multiplier = getUserMultiplier(winner.author.id, 'income');
            const bonus = Math.floor(baseReward * multiplier);
            const totalReward = baseReward + bonus;

            db.addBalance(winner.author.id, totalReward);

            let msgText = `${config.EMOJIS.SUCCESS} **Chính xác!** ${winner.author} đã tìm ra từ **${word}** và nhận được ${config.EMOJIS.COIN} **${baseReward}** coins!`;
            if (bonus > 0) msgText += ` ✨ *(Thưởng item +${bonus})*`;

            message.channel.send(msgText);
            startCooldown(message.client, 'scramble', message.author.id);
        } catch {
            message.channel.send(`${config.EMOJIS.TIMER} **Hết thời gian!** Từ đó là **${word}**.`);
            startCooldown(message.client, 'scramble', message.author.id);
        }
    }
};
