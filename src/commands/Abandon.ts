import { CommandInteraction, Client, ApplicationCommandType, TextChannel } from 'discord.js';
import { Command } from '../Command';
import { findByChannelId } from '../services/match.service.js';

export const Abandon: Command = {
    name: 'abandon',
    description: 'If you absolutely have to leave the game, use this command to abandon it.',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user, channelId } = interaction;
        const content = 'Work in progress';

        //check if in match channel
        const match = await findByChannelId(channelId);
        if (!match) {
            return interaction.reply({
                content: 'Command only works in match thread',
            });
        }

        //remove player from match

        //add a loss to player history

        //set some sort of flag to indicate player has abandoned and from which team. This will be used in elo calculation

        //set a timeout on player, and add a timeout history

        await interaction.reply({
            ephemeral: true,
            content,
        });
    },
};
