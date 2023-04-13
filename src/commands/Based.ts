import { CommandInteraction, Client, ApplicationCommandType, TextChannel } from 'discord.js';
import { Command } from '../Command';

export const Based: Command = {
    name: 'based',
    description: 'But is it tho?',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const content = 'b a s e d.';

        await interaction.reply({
            ephemeral: true,
            content,
        });
    },
};
