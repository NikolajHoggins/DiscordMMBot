import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import * as playerService from '../services/player.service';
import { ready } from '../services/queue.service';

export const Ready: Command = {
    name: 'ready',
    description: 'Ready up for a game',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const { user } = interaction;
        const player = await playerService.findOrCreate(user);
        ready(player);

        const content = `${user.username} readied up!`;

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
