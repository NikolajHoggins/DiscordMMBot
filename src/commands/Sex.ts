import { CommandInteraction, Client, ApplicationCommandType } from 'discord.js';
import { Command } from '../Command';

export const Sex: Command = {
    name: 'sex',
    description: 'Returns a greeting',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const content = 'AHH SEX!';

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
