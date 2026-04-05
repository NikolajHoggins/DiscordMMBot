import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { sendMessageInChannel } from '../helpers/messages';
import { canPing, getChannelId, getConfig, setPingCooldown } from '../services/system.service';
import { ChannelsType, RanksType } from '../types/channel';
import { safelyReplyToInteraction } from '../helpers/interactions';

export const PingPlayers: Command = {
    name: 'pingplayers',
    description: 'Ping players who has signed up for notifications',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const config = await getConfig();
        const pingRoleId = config.roles.find(({ name }) => name === RanksType.ping)?.id;

        const content = `<@&${pingRoleId}> People are trying to start a game.`;

        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);
        const response = await canPing();
        if (response === true) {
            await sendMessageInChannel({
                channelId: queueChannelId,
                messageContent: content,
                client,
            });
            safelyReplyToInteraction({ interaction, content: 'Pinging players', ephemeral: true });

            await setPingCooldown();
            return;
        }

        safelyReplyToInteraction({
            interaction,
            content: 'Cannot ping for another ' + response + 'minutes',
            ephemeral: true,
        });
    },
};
