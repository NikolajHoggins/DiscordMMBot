import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../Command';
import { safelyReplyToInteraction } from '../helpers/interactions';
import { getConfig } from '../services/system.service';
import { GameType } from '../types/queue';

export const DuelQueue: Command = {
    name: 'duelqueue',
    description: 'Queue for a 1v1 duel',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const config = await getConfig();
        if (!config.duelsEnabled) {
            return safelyReplyToInteraction({
                interaction,
                content: 'Duels are currently disabled',
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Duel Queue')
            .setDescription('How would you like to queue?')
            .setColor(0x5865f2);

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('duelQueue.solo')
                .setLabel('Solo')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('duelQueue.party')
                .setLabel('With Party')
                .setStyle(ButtonStyle.Secondary)
        );

        return safelyReplyToInteraction({
            interaction,
            embeds: [embed],
            components: [row],
            ephemeral: true,
        });
    },
};
