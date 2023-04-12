import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { sendMessage } from '../helpers/messages';
import { canPing, getChannelId, setPingCooldown } from '../services/system.service';
import { ChannelsType } from '../types/channel';

export const PingPlayers: Command = {
    name: 'pingplayers',
    description: 'Ping players who has signed up for notifications',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const content = `<@&${process.env.PING_TO_PLAY_ROLE_ID}> People are trying to start a game.`;

        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);
        const response = await canPing();
        if (response === true) {
            await sendMessage({
                channelId: queueChannelId,
                messageContent: content,
                client,
            });
            interaction.reply('Pinging players');

            await setPingCooldown();
            return;
        }

        interaction.reply('Cannot ping for another ' + response + 'minutes');
    },
};
