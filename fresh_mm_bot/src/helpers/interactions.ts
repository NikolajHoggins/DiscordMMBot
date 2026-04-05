import type {
    CommandInteraction,
    ButtonInteraction,
    AttachmentBuilder,
    StringSelectMenuInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
} from 'discord.js';
import { botLog } from './messages';

export const safelyReplyToInteraction = async ({
    interaction,
    content,
    ephemeral,
    files,
    embeds,
    components,
}: {
    interaction: CommandInteraction | ButtonInteraction | StringSelectMenuInteraction;
    content?: string;
    files?: AttachmentBuilder[];
    ephemeral?: boolean;
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<MessageActionRowComponentBuilder>[];
}) => {
    try {
        const message = await interaction.reply({ content, ephemeral, files, embeds, components });
        return message;
    } catch (error) {
        botLog({
            messageContent: `Error responding with interaction: ${content} ${error}`,
            client: interaction.client,
        });
    }
};
