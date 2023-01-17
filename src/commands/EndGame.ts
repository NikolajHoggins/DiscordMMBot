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

import * as matchService from '../services/match.service';

export const EndGame: Command = {
    name: 'end_game',
    description: 'Force end game lobby',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database

        //fetch player from database
        const { channelId } = interaction;

        //find match with channelId
        const match = await matchService.findByChannelId(channelId);
        if (!match) return;
        const content = match ? 'Deleting' : 'Not in match thread';

        await interaction.followUp({
            ephemeral: true,
            content,
        });
        await matchService.end({ matchNumber: match.match_number, client });
    },
};
