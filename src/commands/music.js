const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, getOrCreateQueue } = require('../utils/musicPlayer');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Music player commands')

        .addSubcommand(sub => sub.setName('play').setDescription('Play a song from YouTube')
            .addStringOption(opt => opt.setName('query').setDescription('Song name or YouTube URL').setRequired(true)))

        .addSubcommand(sub => sub.setName('skip').setDescription('Skip the current song'))
        .addSubcommand(sub => sub.setName('stop').setDescription('Stop music and leave'))
        .addSubcommand(sub => sub.setName('pause').setDescription('Pause the current song'))
        .addSubcommand(sub => sub.setName('resume').setDescription('Resume the paused song'))
        .addSubcommand(sub => sub.setName('queue').setDescription('Show the song queue'))
        .addSubcommand(sub => sub.setName('nowplaying').setDescription('Show the current song'))

        .addSubcommand(sub => sub.setName('volume').setDescription('Set the volume')
            .addIntegerOption(opt => opt.setName('level').setDescription('Volume 1-100').setRequired(true).setMinValue(1).setMaxValue(100)))

        .addSubcommand(sub => sub.setName('shuffle').setDescription('Shuffle the queue'))
        .addSubcommand(sub => sub.setName('loop').setDescription('Toggle loop mode (off → song → queue)'))

        .addSubcommand(sub => sub.setName('remove').setDescription('Remove a song from the queue')
            .addIntegerOption(opt => opt.setName('position').setDescription('Position in queue').setRequired(true).setMinValue(1)))

        .addSubcommand(sub => sub.setName('clear').setDescription('Clear the queue')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'play': return handlePlay(interaction);
            case 'skip': return handleSkip(interaction);
            case 'stop': return handleStop(interaction);
            case 'pause': return handlePause(interaction);
            case 'resume': return handleResume(interaction);
            case 'queue': return handleQueue(interaction);
            case 'nowplaying': return handleNowPlaying(interaction);
            case 'volume': return handleVolume(interaction);
            case 'shuffle': return handleShuffle(interaction);
            case 'loop': return handleLoop(interaction);
            case 'remove': return handleRemove(interaction);
            case 'clear': return handleClear(interaction);
        }
    },
};

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function requireVoice(interaction) {
    const vc = interaction.member?.voice?.channel;
    if (!vc) {
        interaction.reply({ embeds: [errEmbed('You must be in a voice channel!')], ephemeral: true });
        return null;
    }
    return vc;
}

function requireQueue(interaction) {
    const q = getQueue(interaction.guildId);
    if (!q || !q.playing) {
        interaction.reply({ embeds: [errEmbed('Nothing is playing!')], ephemeral: true });
        return null;
    }
    return q;
}

function errEmbed(msg) {
    return new EmbedBuilder().setDescription(`❌ ${msg}`).setColor(0xE74C3C);
}

function musicEmbed(title, desc, color = 0x1DB954) {
    return new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color);
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'Live';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════
// Handlers
// ═══════════════════════════════════════════════════════════════════

async function handlePlay(interaction) {
    const vc = requireVoice(interaction);
    if (!vc) return;

    await interaction.deferReply();

    const query = interaction.options.getString('query');
    const queue = getOrCreateQueue(interaction.guildId);

    if (!queue.connection) {
        await queue.connect(vc, interaction.channel);
    }

    const song = await queue.addSong(query, interaction.user.username);
    if (!song) {
        return interaction.editReply({ embeds: [errEmbed('No results found!')] });
    }

    const embed = new EmbedBuilder()
        .setColor(0x1DB954)
        .setTimestamp();

    if (queue.songs.length === 0 && queue.currentSong === song) {
        embed.setTitle('🎵  Now Playing')
            .setDescription(`**[${song.title}](${song.url})**\n\n⏱️ Duration: \`${song.duration}\`\n🎤 Requested by: **${song.requester}**`);
    } else {
        embed.setTitle('📥  Added to Queue')
            .setDescription(`**[${song.title}](${song.url})**\n\n⏱️ Duration: \`${song.duration}\`\n📋 Position: **#${queue.songs.length}**`);
    }

    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
    return interaction.editReply({ embeds: [embed] });
}

async function handleSkip(interaction) {
    const q = requireQueue(interaction);
    if (!q) return;
    const skipped = q.currentSong;
    q.skip();
    return interaction.reply({ embeds: [musicEmbed('⏭️  Skipped', `Skipped **${skipped?.title || 'Unknown'}**`)] });
}

async function handleStop(interaction) {
    const q = requireQueue(interaction);
    if (!q) return;
    q.stop();
    return interaction.reply({ embeds: [musicEmbed('⏹️  Stopped', 'Music stopped and queue cleared.', 0xE74C3C)] });
}

async function handlePause(interaction) {
    const q = requireQueue(interaction);
    if (!q) return;
    if (!q.pause()) return interaction.reply({ embeds: [errEmbed('Already paused!')], ephemeral: true });
    return interaction.reply({ embeds: [musicEmbed('⏸️  Paused', 'Music paused. Use `/music resume` to continue.')] });
}

async function handleResume(interaction) {
    const q = requireQueue(interaction);
    if (!q) return;
    if (!q.resume()) return interaction.reply({ embeds: [errEmbed('Not paused!')], ephemeral: true });
    return interaction.reply({ embeds: [musicEmbed('▶️  Resumed', 'Music resumed!')] });
}

async function handleQueue(interaction) {
    const q = getQueue(interaction.guildId);
    if (!q || (!q.currentSong && q.songs.length === 0)) {
        return interaction.reply({ embeds: [errEmbed('Queue is empty!')], ephemeral: true });
    }

    const lines = [];
    if (q.currentSong) {
        lines.push(`🎵 **Now:** [${q.currentSong.title}](${q.currentSong.url}) \`${q.currentSong.duration}\``);
    }
    if (q.songs.length > 0) {
        lines.push('');
        q.songs.slice(0, 10).forEach((s, i) => {
            lines.push(`**${i + 1}.** [${s.title}](${s.url}) \`${s.duration}\``);
        });
        if (q.songs.length > 10) lines.push(`\n*...and ${q.songs.length - 10} more*`);
    }

    const loopIcon = q.loop === 'off' ? '❌' : q.loop === 'song' ? '🔂' : '🔁';
    const footer = `${q.songs.length} song(s) in queue • Loop: ${loopIcon} ${q.loop} • Volume: ${q.volume}%`;

    const embed = new EmbedBuilder()
        .setTitle('📋  Music Queue')
        .setDescription(lines.join('\n'))
        .setColor(0x5865F2)
        .setFooter({ text: footer });

    return interaction.reply({ embeds: [embed] });
}

async function handleNowPlaying(interaction) {
    const q = requireQueue(interaction);
    if (!q) return;

    const s = q.currentSong;
    const embed = new EmbedBuilder()
        .setTitle('🎵  Now Playing')
        .setDescription(`**[${s.title}](${s.url})**\n\n⏱️ Duration: \`${s.duration}\`\n🎤 Requested by: **${s.requester}**\n🔊 Volume: **${q.volume}%**\n🔁 Loop: **${q.loop}**`)
        .setColor(0x1DB954);
    if (s.thumbnail) embed.setThumbnail(s.thumbnail);

    return interaction.reply({ embeds: [embed] });
}

async function handleVolume(interaction) {
    const q = requireQueue(interaction);
    if (!q) return;
    const vol = interaction.options.getInteger('level');
    q.setVolume(vol);
    const icon = vol > 70 ? '🔊' : vol > 30 ? '🔉' : '🔈';
    return interaction.reply({ embeds: [musicEmbed(`${icon}  Volume`, `Set to **${vol}%**`)] });
}

async function handleShuffle(interaction) {
    const q = getQueue(interaction.guildId);
    if (!q || q.songs.length < 2) {
        return interaction.reply({ embeds: [errEmbed('Need at least 2 songs in queue to shuffle!')], ephemeral: true });
    }
    q.shuffle();
    return interaction.reply({ embeds: [musicEmbed('🔀  Shuffled', `Shuffled **${q.songs.length}** songs in the queue!`)] });
}

async function handleLoop(interaction) {
    const q = requireQueue(interaction);
    if (!q) return;
    const mode = q.toggleLoop();
    const icons = { off: '❌ Off', song: '🔂 Song', queue: '🔁 Queue' };
    return interaction.reply({ embeds: [musicEmbed('🔁  Loop Mode', `Set to **${icons[mode]}**`)] });
}

async function handleRemove(interaction) {
    const q = getQueue(interaction.guildId);
    if (!q || q.songs.length === 0) {
        return interaction.reply({ embeds: [errEmbed('Queue is empty!')], ephemeral: true });
    }
    const pos = interaction.options.getInteger('position');
    const removed = q.remove(pos - 1);
    if (!removed) return interaction.reply({ embeds: [errEmbed('Invalid position!')], ephemeral: true });
    return interaction.reply({ embeds: [musicEmbed('🗑️  Removed', `Removed **${removed.title}** from the queue.`)] });
}

async function handleClear(interaction) {
    const q = getQueue(interaction.guildId);
    if (!q || q.songs.length === 0) {
        return interaction.reply({ embeds: [errEmbed('Queue is already empty!')], ephemeral: true });
    }
    const count = q.songs.length;
    q.clear();
    return interaction.reply({ embeds: [musicEmbed('🧹  Cleared', `Removed **${count}** songs from the queue.`)] });
}
