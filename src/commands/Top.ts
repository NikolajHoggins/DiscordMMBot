import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { ceil } from 'lodash';
import { Command } from '../Command';
import Player from '../models/player.schema';

export const Top: Command = {
    name: 'top',
    description: 'Get top players',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const topPlayers = await Player.find().sort({ wins: -1 }).limit(10);

        let content = '```';
        topPlayers.forEach((player, i) => {
            const winRate = ceil((player.wins / (player.wins + player.losses)) * 100);

            content = `${content}
[${i + 1}] - ${player.name} - ${player.wins} wins - ${isNaN(winRate) ? '0' : winRate}% winrate`;
        });

        content = content + '```';

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
