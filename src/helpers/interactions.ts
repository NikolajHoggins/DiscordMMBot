import type {
    CommandInteraction,
    ButtonInteraction,
    AttachmentBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import { botLog } from './messages';

export const safelyReplyToInteraction = async ({
    interaction,
    content,
    ephemeral,
    files,
}: {
    interaction: CommandInteraction | ButtonInteraction | StringSelectMenuInteraction;
    content?: string;
    files?: AttachmentBuilder[];
    ephemeral?: boolean;
}) => {
    try {
        await interaction.reply({ content, ephemeral, files });
    } catch (error) {
        botLog({
            messageContent: `Error responding with interaction: ${content} ${error}`,
            client: interaction.client,
        });
    }
};
