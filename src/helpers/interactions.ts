import type {
    CommandInteraction,
    ButtonInteraction,
    AttachmentBuilder,
    StringSelectMenuInteraction,
    EmbedBuilder,
} from 'discord.js';
import { botLog } from './messages';

export const safelyReplyToInteraction = async ({
    interaction,
    content,
    ephemeral,
    files,
    embeds,
}: {
    interaction: CommandInteraction | ButtonInteraction | StringSelectMenuInteraction;
    content?: string;
    files?: AttachmentBuilder[];
    ephemeral?: boolean;
    embeds?: EmbedBuilder[];
}) => {
    try {
        await interaction.reply({ content, ephemeral, files, embeds });
    } catch (error) {
        botLog({
            messageContent: `Error responding with interaction: ${content} ${error}`,
            client: interaction.client,
        });
    }
};
