const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, NoSubscriberBehavior } = require('@discordjs/voice');
const scdl = require('scdl-core');
const { EmbedBuilder } = require('discord.js');

// Per-guild music queues
const queues = new Map();

/**
 * Format duration in seconds to MM:SS
 */
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'Live';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

class MusicQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.songs = [];
        this.playing = false;
        this.paused = false;
        this.volume = 50;
        this.loop = 'off'; // 'off', 'song', 'queue'
        this.connection = null;
        this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        this.currentSong = null;
        this.textChannel = null;

        // Player Event Listeners
        this.player.on(AudioPlayerStatus.Idle, () => this._onSongEnd());
        this.player.on('error', (err) => {
            console.error(`[Music] Player error in guild ${this.guildId}:`, err.message);
            this._onSongEnd();
        });
    }

    /**
     * Handles the end of a song (playback finished or error)
     */
    async _onSongEnd() {
        // Loop Logic
        if (this.loop === 'song' && this.currentSong) {
            return this._play(this.currentSong);
        }

        if (this.loop === 'queue' && this.currentSong) {
            this.songs.push(this.currentSong);
        }

        // Check if queue is empty
        if (this.songs.length === 0) {
            this.currentSong = null;
            this.playing = false;

            // Auto-disconnect timer (2 minutes)
            setTimeout(() => {
                if (!this.playing && this.connection) {
                    this.destroy();
                    if (this.textChannel) {
                        this.textChannel.send({
                            embeds: [new EmbedBuilder().setTitle('👋  Disconnected').setDescription('Queue empty — left the voice channel.').setColor(0x95A5A6)]
                        }).catch(() => { });
                    }
                }
            }, 120_000);
            return;
        }

        // Play next song
        const next = this.songs.shift();
        await this._play(next);
    }

    /**
     * Internal method to play a song
     */
    async _play(song) {
        try {
            // SoundCloud Streaming Only
            const stream = await scdl.download(song.url, {
                highWaterMark: 1 << 25
            });

            // Create Audio Resource
            const resource = createAudioResource(stream, {
                inputType: undefined,
                inlineVolume: true,
            });
            resource.volume?.setVolume(this.volume / 100);

            // Start Playback
            this.player.play(resource);
            this.currentSong = song;
            this.playing = true;
            this.paused = false;

        } catch (err) {
            console.error(`[Music] Playback error for ${song.title}:`, err.message);

            if (this.textChannel) {
                this.textChannel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('❌  Playback Error')
                        .setDescription(`Could not play **${song.title}**.\n*Reason: ${err.message}*`)
                        .setColor(0xE74C3C)]
                }).catch(() => { });
            }
            // Skip to next song if this one fails
            this._onSongEnd();
        }
    }

    /**
     * Connect to a voice channel
     */
    async connect(voiceChannel, textChannel) {
        this.textChannel = textChannel;
        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        this.connection.subscribe(this.player);

        // Handle raw disconnection events (kick/move)
        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                // Wait to see if it's a reconnect (e.g. moving channels)
                await Promise.race([
                    entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                // Determine it was a real disconnect
                this.destroy();
            }
        });
    }

    /**
     * Add a song to the queue (SoundCloud Only)
     */
    async addSong(query, requester) {
        let songInfo;

        // Valid SoundCloud Link Check
        if (query.includes('soundcloud.com') && scdl.isValidUrl(query)) {
            try {
                const info = await scdl.getInfo(query);
                songInfo = {
                    title: info.title,
                    url: info.permalink_url,
                    duration: formatDuration(info.duration / 1000),
                    thumbnail: info.artwork_url,
                    requester,
                    source: 'soundcloud'
                };
            } catch (err) { throw new Error('Could not fetch SoundCloud track info.'); }
        } else {
            throw new Error('⚠️ **Only SoundCloud links are supported.**\nYouTube playback is currently blocked.');
        }

        // Logic: Play immediately if idle, otherwise queue
        if (!this.playing) {
            await this._play(songInfo);
        } else {
            this.songs.push(songInfo);
        }

        return songInfo;
    }

    skip() {
        this.player.stop();
        // _onSongEnd will trigger automatically
    }

    stop() {
        this.songs = [];
        this.loop = 'off';
        this.currentSong = null;
        this.player.stop();
        this.destroy();
    }

    pause() {
        if (this.playing) {
            this.player.pause();
            this.paused = true;
            return true;
        }
        return false;
    }

    resume() {
        if (this.paused) {
            this.player.unpause();
            this.paused = false;
            return true;
        }
        return false;
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(100, vol));
    }

    shuffle() {
        for (let i = this.songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.songs[i], this.songs[j]] = [this.songs[j], this.songs[i]];
        }
    }

    toggleLoop() {
        const modes = ['off', 'song', 'queue'];
        const currentIdx = modes.indexOf(this.loop);
        this.loop = modes[(currentIdx + 1) % modes.length];
        return this.loop;
    }

    remove(index) {
        if (index < 0 || index >= this.songs.length) return null;
        return this.songs.splice(index, 1)[0];
    }

    clear() {
        this.songs = [];
    }

    destroy() {
        this.connection?.destroy();
        this.connection = null;
        this.player.stop();
        this.playing = false;
        this.currentSong = null;
        queues.delete(this.guildId);
    }
}

function getQueue(guildId) {
    return queues.get(guildId);
}

function getOrCreateQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, new MusicQueue(guildId));
    }
    return queues.get(guildId);
}

module.exports = { getQueue, getOrCreateQueue, formatDuration };
