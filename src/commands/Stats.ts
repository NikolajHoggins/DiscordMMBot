import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import * as playerService from '../services/player.service';

export const Stats: Command = {
    name: 'stats',
    description: 'Get player stats?',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const { user } = interaction;
        const player = await playerService.findOrCreate(user);

        // const player = await playerService.get(interaction.user.id);

        const content = `User ${player.name} has a rating of ${player.rating}`;

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
