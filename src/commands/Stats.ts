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
        const { history } = player;
        const wins = history.filter(match => match.result === 'win').length;
        const matches = history.length;
        const losses = matches - wins;
        const winRate = ceil((wins / (wins + losses)) * 100);

        const content = `User ${player.name} [${Math.floor(
            player.rating
        )}] has ${wins} wins and ${losses} losses. ${!isNaN(winRate) ? winRate : 0}% winrate`;

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
