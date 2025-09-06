import type { CommandInteraction, ButtonInteraction } from 'discord.js';
import { botLog } from './messages';

export const safelyReplyToInteraction = async ({
    interaction,
    content,
    ephemeral,
}: {
    interaction: CommandInteraction | ButtonInteraction;
    content: string;
    ephemeral: boolean;
}) => {
    try {
        await interaction.reply({ content, ephemeral });
    } catch (error) {
        botLog({
            messageContent: `Error responding with interaction: ${content} ${error}`,
            client: interaction.client,
        });
    }
};
