import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ButtonInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder,
} from 'discord.js';
import { Command } from '../Command';
import { updateStatus } from '../crons/updateQueue';
import * as playerService from '../services/player.service';
import * as partyService from '../services/party.service';
import { unReady } from '../services/queue.service';
import { safelyReplyToInteraction } from '../helpers/interactions';

export const handleUnready = async (
    client: Client,
    interaction: CommandInteraction | ButtonInteraction
) => {
    const { user } = interaction;

    // Check if player is in a party
    const party = await partyService.findPartyByMember(user.id);

    if (party) {
        // Show solo vs party unqueue options
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('unready.solo')
                .setLabel('Leave queue (solo)')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`unready.party.${party.name}`)
                .setLabel(`Leave queue (${party.name})`)
                .setStyle(ButtonStyle.Danger)
        );

        return safelyReplyToInteraction({
            interaction,
            content: 'How would you like to leave the queue?',
            components: [row],
            ephemeral: true,
        });
    }

    // No party — unqueue just this player
    const player = await playerService.findOrCreate(user);
    unReady({ discordId: player.discordId });
    updateStatus(client);

    safelyReplyToInteraction({
        interaction,
        ephemeral: true,
        content: 'You are no longer in queue',
    });
};

export const handleUnreadyButtonInteraction = async (
    interaction: ButtonInteraction,
    client: Client
) => {
    const parts = interaction.customId.split('.');
    const mode = parts[1]; // 'solo' | 'party'

    if (mode === 'solo') {
        const player = await playerService.findOrCreate(interaction.user);
        unReady({ discordId: player.discordId });
        updateStatus(client);
        return interaction.update({ content: 'You are no longer in queue', components: [] });
    }

    if (mode === 'party') {
        const partyName = parts.slice(2).join('.');
        const party = await partyService.findPartyByName(partyName);

        if (!party) {
            return interaction.update({ content: 'Party not found.', components: [] });
        }

        if (party.leaderId !== interaction.user.id) {
            return interaction.update({
                content: 'Only the party leader can unqueue the party.',
                components: [],
            });
        }

        for (const memberId of party.members) {
            unReady({ discordId: memberId });
        }
        updateStatus(client);
        return interaction.update({
            content: `${party.name} has been removed from queue`,
            components: [],
        });
    }
};

export const Unready: Command = {
    name: 'unready',
    description: 'Unready',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        handleUnready(client, interaction);
    },
};
