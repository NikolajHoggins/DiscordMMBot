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

        await interaction.reply({
            ephemeral: true,
            content,
        });
    },
};
