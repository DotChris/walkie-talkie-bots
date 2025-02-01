import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    StreamType,
    VoiceConnectionStatus,
    getGroups, getVoiceConnection, EndBehaviorType, NoSubscriberBehavior
} from '@discordjs/voice';
import { GuildMember } from "discord.js";

const player = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
    },
});

let audio;

const createListeningStream = async (receiver, userId) => {
    const opusStream = receiver.subscribe(userId, {
        end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 1000,
        },
    });

    return {opusStream, audio: createAudioResource(opusStream, {inputType: StreamType.Opus})};
};
const playSong = async (audioResource) => {

    console.log("Trying to play, ", audioResource)
    await player.play(audioResource);
};

export const joinHandler = async (interaction) => {
    // debug consoles
    // console.log({interaction, user: interaction.member.user, groups: getGroups()});
    // console.log({member: interaction.member, guild: interaction.member.guild});
    // console.log({voiceChannels: await interaction.guild.channels.fetch()})
    await interaction.deferReply();
    let connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
        if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
            const channel = interaction.member.voice.channel;
            connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                selfDeaf: false,
                selfMute: false,
                // @ts-expect-error Currently voice is built in mind with API v10 whereas discord.js v13 uses API v9.
                adapterCreator: interaction.member.guild.voiceAdapterCreator,
            });
        } else {
            await interaction.followUp(interaction.id, interaction.token, 'Join a voice channel and then try that again!');
            return;
        }
    }

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
        const receiver = connection.receiver;
        let stream;

        receiver.speaking.on('start', async (userId) => {
            // alex 450103199139889153
            // dotchris 137966587356381184
            // yami 165468019890454528
            // check if user is the currently assigned listener //TODO use a db lookup
            if (userId === '137966587356381184') {
                stream = await createListeningStream(receiver, userId);
                audio = stream.audio;
                await playSong(audio);
            }
        });
    } catch (error) {
        console.warn(error);
        await interaction.followUp(interaction.id, interaction.token, 'Failed to join voice channel within 20 seconds, please try again later!');
    }
    await interaction.followUp('Ready!');
};

export const joinMessageHandler = async message => {
    let connection2 = getVoiceConnection(message.guildId, "secondary");

    try {
        if (!connection2) {
            // nerds voice channel "BDO" 840395437843415060
            // check if voice channel is valid then try to join it
            // TODO use a db lookup
            const channel2 = await message.guild.channels.fetch("840395437843415060");
            connection2 = new joinVoiceChannel({
                channelId: channel2.id,
                guildId: channel2.guildId,
                selfDeaf: false,
                selfMute: false,
                group: "secondary",
                adapterCreator: channel2.guild.voiceAdapterCreator,
            })
            // subscribe to the local audio stream
            connection2.subscribe(player);
        }
        /**
         * Allow ourselves 30 seconds to join the voice channel. If we do not join within then,
         * an error is thrown.
         */
        await entersState(connection2, VoiceConnectionStatus.Ready, 30_000);
        /**
         * At this point, the voice connection is ready within 30 seconds! This means we can
         * start playing audio in the voice channel. We return the connection, so it can be
         * used by the caller.
         */
        return connection2;
    } catch (error) {
        /**
         * At this point, the voice connection has not entered the Ready state. We should make
         * sure to destroy it, and propagate the error by throwing it, so that the calling function
         * is aware that we failed to connect to the channel.
         */
        if (connection2)
            connection2.destroy();
        let myReply = ''
        switch(error.code) {
            case 'GuildChannelUnowned':
                myReply = "The channel I am assigned to does not belong to this server.";
                break;
            default:
                myReply = "An error occurred";
        }
        message.channel.send(myReply);
    }
}
