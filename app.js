import { Client, GatewayIntentBits } from 'discord.js';

import { commands } from './src/const.js';
import { joinHandler, joinMessageHandler } from './src/commands';
import config from "./config.json" assert { type: "json" };

const clientOptions = {intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]};
const client = new Client(clientOptions);
const client2 = new Client(clientOptions);

// Listen for the ready event
client.once("ready", () => console.log('Ready!'));
client2.once("ready", async () => {
    console.log('Ready2!');
});

client.on( "interactionCreate", async (interaction)=> {
    console.log({interaction});
    switch( interaction.commandName ) {
        case commands.join:
            await joinHandler(interaction);
            break;
        case commands.help:
        default:
            let availableCommands = '';
            Object.values(commands).forEach( cmd => { availableCommands += '\n' + cmd });
            await interaction.reply(interaction.id, interaction.token,{content: `Try one of the following commands \`\`\`${availableCommands}\`\`\``, ephemeral: true});
    }
});


client2.on("messageCreate", (message) => {
    console.log("client2", message);
    if (message.author.id !== client.user.id)
        return;
    else if( message.author.id === client.user.id && message.interaction?.commandName.startsWith("join")) {
        joinMessageHandler(message);
    }

});

client.login(config.token);
client2.login(config.token2);
