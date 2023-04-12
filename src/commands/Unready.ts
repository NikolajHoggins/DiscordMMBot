import { CommandInteraction, Client, ApplicationCommandType, ButtonInteraction } from 'discord.js';
import { Command } from '../Command';
import { updateStatus } from '../crons/updateQueue';
import * as playerService from '../services/player.service';
import { unReady } from '../services/queue.service';

export const handleUnready = async (
    client: Client,
    interaction: CommandInteraction | ButtonInteraction
) => {
    const { user } = interaction;
    const player = await playerService.findOrCreate(user);
    unReady({ discordId: player.discordId });

    updateStatus(client);

    const content = `You are no longer in queue`;

    interaction.reply({
        ephemeral: true,
        content,
    });
};

export const Unready: Command = {
    name: 'unready',
    description: 'Unready',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        handleUnready(client, interaction);
    },
};
