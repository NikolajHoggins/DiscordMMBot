import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import { updateStatus } from '../crons/updateQueue';
import * as playerService from '../services/player.service';
import { unReady } from '../services/queue.service';

export const Unready: Command = {
    name: 'unready',
    description: 'Unready',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const { user } = interaction;
        const player = await playerService.findOrCreate(user);
        await unReady({ discordId: player.discordId });

        updateStatus(client);

        const content = `You are no longer ready`;

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
