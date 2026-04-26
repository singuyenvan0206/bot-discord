const { Events } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        // We only care about the bot itself
        if (oldState.member.id !== oldState.client.user.id) return;

        // If the bot was in a channel but is now not (Kicked or Left)
        if (oldState.channelId && !newState.channelId) {
            console.log(`[VoiceStateUpdate] Bot was removed from channel ${oldState.channelId} in guild ${oldState.guild.id}. Cleaning up connection.`);
            
            const connection = getVoiceConnection(oldState.guild.id);
            if (connection) {
                // Destroying the connection will also trigger the Disconnected/Destroyed listeners in talk.js
                connection.destroy();
            }
        }
        
        // If the bot was moved to a different channel (Optional: logic to handle moves if needed)
        // if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        //     console.log(`[VoiceStateUpdate] Bot was moved to channel ${newState.channelId}`);
        // }
    },
};
