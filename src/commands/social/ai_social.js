const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { generateAIResponse } = require('../../utils/ai');
const { getLanguage, t } = require('../../utils/i18n');

module.exports = {
  name: 'social',
  aliases: ['roast', 'compliment'],
  description: 'Roast hoặc Khen ngợi người dùng bằng AI dựa trên uy tín (AI Roast/Compliment)',
  usage: '[roast | compliment] @user',
  async execute(message, args) {
    const lang = await getLanguage(message.author.id, message.guild?.id);
    const subCommand = args[0]?.toLowerCase();
    const targetUser = message.mentions.users.first();

    if (!subCommand || !['roast', 'compliment'].includes(subCommand) || !targetUser) {
      return message.reply(`Sử dụng: \`${config.PREFIX}social [roast|compliment] @user\``);
    }

    await message.channel.sendTyping();

    const guildRow = await db.getGuild(message.guild.id);
    const personality = guildRow?.personality || 'default';
    const targetStats = await db.getUser(targetUser.id, message.guild.id);

    let prompt = '';
    if (subCommand === 'roast') {
      prompt = `Hãy roast người dùng này: ${targetUser.username}. 
      Thông tin: Toxic score: ${targetStats.toxic_score}, Helpful score: ${targetStats.helpful_score}.
      Hãy roast dựa trên các chỉ số này một cách mỉa mai theo nhân cách hiện tại của bạn.`;
    } else {
      prompt = `Hãy khen ngợi người dùng này: ${targetUser.username}. 
      Thông tin: Toxic score: ${targetStats.toxic_score}, Helpful score: ${targetStats.helpful_score}.
      Hãy khen ngợi dựa trên các chỉ số này một cách chân thành.`;
    }

    const aiReply = await generateAIResponse(prompt, personality, {});

    const embed = new EmbedBuilder()
      .setAuthor({ name: subCommand === 'roast' ? '🔥 AI Roast' : '💖 AI Compliment', iconURL: targetUser.displayAvatarURL() })
      .setDescription(aiReply)
      .setColor(subCommand === 'roast' ? 0xff4d4d : 0xffcc00)
      .setFooter({ text: `Dành cho: ${targetUser.tag}` });

    message.reply({ embeds: [embed] });
  },
};
