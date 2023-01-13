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
        let player = await playerService.get(user.id);
        if (!player) {
            console.log('player not found, creating');
            player = await playerService.create({
                discordId: user.id,
                rating: 1000,
                name: user.username,
            });
        }

        // const player = await playerService.get(interaction.user.id);
        console.log(player);

        const content = 'Nothing happened.. maybe finish command nerd dev!';

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
