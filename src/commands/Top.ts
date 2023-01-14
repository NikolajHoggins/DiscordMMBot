import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';
import Player from '../models/player.schema';

export const Top: Command = {
    name: 'top',
    description: 'Get top players',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //Fetch user from database
        const topPlayers = await Player.find().sort({ rating: -1 }).limit(10);

        let content = '```';
        topPlayers.forEach((player, i) => {
            content = `${content}
[${i + 1}] - ${player.name} - ${player.rating}`;
        });

        content = content + '```';

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
