import {
    ButtonInteraction,
    Client,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalActionRowComponentBuilder,
    TextChannel,
} from 'discord.js';
import { isUserMod } from '../../helpers/permissions';
import { safelyReplyToInteraction } from '../../helpers/interactions';
import * as enforcementService from '../../services/enforcement.service';
import { buildEnforcementEmbed, buildEnforcementButtons } from '../../commands/mod/Timeout';
import Player from '../../models/player.schema';
import { sendDirectMessage } from '../../helpers/messages';

export const handleTimeoutInteraction = async (interaction: ButtonInteraction, client: Client) => {
    const parts = interaction.customId.split('.');
    const action = parts[1]; // 'edit' or 'void'
    const enforcementId = parts[2];

    const isMod = await isUserMod(client, interaction);
    if (!isMod) return;

    const enforcement = await enforcementService.getEnforcementById(enforcementId);
    if (!enforcement) {
        return safelyReplyToInteraction({
            interaction,
            content: 'Enforcement record not found',
            ephemeral: true,
        });
    }

    if (action === 'void') {
        const modal = new ModalBuilder()
            .setCustomId(`enforcement.voidModal.${enforcementId}`)
            .setTitle('Void Enforcement');

        const reasonInput = new TextInputBuilder()
            .setCustomId('voidReason')
            .setLabel('Reason for voiding')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Explain why this enforcement is being voided...');

        const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            reasonInput
        );
        modal.addComponents(row);
        await interaction.showModal(modal);
    } else if (action === 'edit') {
        const modal = new ModalBuilder()
            .setCustomId(`enforcement.editModal.${enforcementId}`)
            .setTitle('Edit Mod Notes');

        const notesInput = new TextInputBuilder()
            .setCustomId('modNotes')
            .setLabel('New Mod Notes')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setValue(enforcement.modNotes || '')
            .setPlaceholder('Update the mod notes for this enforcement...');

        const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            notesInput
        );
        modal.addComponents(row);
        await interaction.showModal(modal);
    }
};

export const handleTimeoutModalSubmit = async (interaction: any, client: Client) => {
    const parts = interaction.customId.split('.');
    const modalType = parts[1]; // 'voidModal' or 'editModal'
    const enforcementId = parts[2];

    const isMod = await isUserMod(client, interaction);
    if (!isMod) {
        return interaction.reply({
            content: 'You do not have permission to manage enforcements',
            ephemeral: true,
        });
    }

    const enforcement = await enforcementService.getEnforcementById(enforcementId);
    if (!enforcement) {
        return interaction.reply({
            content: 'Enforcement record not found',
            ephemeral: true,
        });
    }

    if (modalType === 'voidModal') {
        const voidReason = interaction.fields.getTextInputValue('voidReason');

        // Void the enforcement
        const updated = await enforcementService.voidEnforcement({
            enforcementId,
            voidedBy: interaction.user.id,
            voidReason,
        });

        // Remove the ban from the player
        await Player.updateOne({ discordId: enforcement.odId }, { $set: { banEnd: 0 } });

        // DM the user
        try {
            await sendDirectMessage({
                client,
                userId: enforcement.odId,
                message: `Your timeout has been voided by a moderator. You can now queue again.`,
            });
        } catch {}

        // Update the original log message
        if (updated && enforcement.logMessageId && enforcement.logChannelId) {
            try {
                const channel = (await client.channels.fetch(
                    enforcement.logChannelId
                )) as TextChannel;
                const message = await channel.messages.fetch(enforcement.logMessageId);
                const embed = buildEnforcementEmbed(updated);
                const row = buildEnforcementButtons(
                    enforcementId,
                    true,
                    enforcement.durationMinutes
                );
                await message.edit({ embeds: [embed], components: [row] });
            } catch (e) {
                console.error('Failed to update log message:', e);
            }
        }

        await interaction.reply({
            content: `Enforcement **${enforcementId}** has been voided. Reason: ${voidReason}`,
            ephemeral: true,
        });
    } else if (modalType === 'editModal') {
        const newNotes = interaction.fields.getTextInputValue('modNotes');

        const updated = await enforcementService.updateModNotes({
            enforcementId,
            modId: interaction.user.id,
            newNotes,
        });

        // Update the original log message
        if (updated && enforcement.logMessageId && enforcement.logChannelId) {
            try {
                const channel = (await client.channels.fetch(
                    enforcement.logChannelId
                )) as TextChannel;
                const message = await channel.messages.fetch(enforcement.logMessageId);
                const embed = buildEnforcementEmbed(updated);
                const row = buildEnforcementButtons(
                    enforcementId,
                    updated.status === 'voided',
                    enforcement.durationMinutes
                );
                await message.edit({ embeds: [embed], components: [row] });
            } catch (e) {
                console.error('Failed to update log message:', e);
            }
        }

        await interaction.reply({
            content: `Mod notes updated for enforcement **${enforcementId}**.`,
            ephemeral: true,
        });
    }
};
