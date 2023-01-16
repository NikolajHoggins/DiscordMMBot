import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    TextChannel,
    Channel,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { updateStatus } from '../crons/updateQueue';
import { getGuild } from '../helpers/guild';
import { findByChannelId } from '../services/match.service';

export const EndGame: Command = {
    name: 'end_game',
    description: 'Force end game lobby',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database

        //fetch player from database
        const { user, channelId } = interaction;

        //find match with channelId
        const match = await findByChannelId(channelId);
        if (!match) return;

        //delete role
        const guild = await getGuild(client);
        await guild?.roles.delete(match.roleId);
        const content = match ? 'Deleting' : 'Not in match thread';
        await interaction.followUp({
            ephemeral: true,
            content,
        });
        await guild?.channels.delete(match.channelId);
    },
};
