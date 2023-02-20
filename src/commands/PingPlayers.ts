import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { sendMessage } from '../helpers/messages';
import { canPing, setPingCooldown } from '../services/system.service';

export const PingPlayers: Command = {
    name: 'pingplayers',
    description: 'Ping players who has signed up for notifications',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const content = `<@&${process.env.PING_TO_PLAY_ROLE_ID}> People are trying to start a game.`;

        const response = await canPing();
        if (response === true) {
            await sendMessage({
                channelId: process.env.QUEUE_CHANNEL,
                messageContent: content,
                client,
            });
            interaction.followUp('Pinging players');

            await setPingCooldown();
            return;
        }

        interaction.followUp('Cannot ping for another ' + response + 'minutes');
    },
};
