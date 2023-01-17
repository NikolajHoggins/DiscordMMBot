import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { ceil, floor } from 'lodash';
import { Command } from '../Command';
import * as playerService from '../services/player.service';

export const Stats: Command = {
    name: 'stats',
    description: 'Get player stats?',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const player = await playerService.findOrCreate(user);

        const winRate = ceil((player.wins / (player.wins + player.losses)) * 100);
        const content = `User ${player.name} has ${player.wins} wins and ${player.losses} losses. ${
            isNaN(winRate) ? '0' : winRate
        }% winrate`;

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
