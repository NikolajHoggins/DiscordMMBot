import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import * as playerService from '../services/player.service';

export const Ready: Command = {
    name: 'ready',
    description: 'Ready up for a game',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const { user } = interaction;
        const player = await playerService.create({
            discordId: user.id,
            rating: 1000,
            name: user.username,
        });
        // const player = await playerService.get(interaction.user.id);
        console.log(player);

        const content = 'Nothing happened.. maybe finish command nerd dev!';

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
