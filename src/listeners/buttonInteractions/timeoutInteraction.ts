import {
    ButtonInteraction,
    Client,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalActionRowComponentBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder,
} from 'discord.js';
import Player from '../../models/player.schema';
import { botLog, sendDirectMessage } from '../../helpers/messages';
import { isUserMod } from '../../helpers/permissions';
import { parseDuration, formatDuration } from '../../helpers/duration';
import { safelyReplyToInteraction } from '../../helpers/interactions';

export const handleTimeoutInteraction = async (
    interaction: ButtonInteraction,
    client: Client
) => {
    const action = interaction.customId.split('.')[1]; // 'edit' or 'void'
    const userId = interaction.customId.split('.')[2];

    // Check if user is a mod
    const isMod = await isUserMod(client, interaction);
    if (!isMod) {
        return safelyReplyToInteraction({
            interaction,
            content: 'You do not have permission to manage timeouts',
            ephemeral: true,
        });
    }

    const player = await Player.findOne({ discordId: userId });
    if (!player) {
        return safelyReplyToInteraction({
            interaction,
            content: 'Player not found',
            ephemeral: true,
        });
    }

    if (action === 'void') {
        // Remove timeout
        await Player.updateOne(
            { discordId: userId },
            {
                $set: { banEnd: 0 },
            }
        );

        botLog({
            messageContent: `<@${interaction.user.id}> voided timeout for <@${userId}>`,
            client,
        });

        // Send DM to user
        try {
            await sendDirectMessage({
                client,
                userId: userId,
                message: `Your Breachers Ranked Matchmaking timeout has been voided by a moderator. You can now queue again.`,
            });
        } catch (error) {
            console.error('Failed to send DM to user:', error);
        }

        // Update the embed
        const voidEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Timeout Voided')
            .addFields(
                { name: 'User', value: `<@${userId}>`, inline: true },
                { name: 'Voided By', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

        await interaction.update({
            embeds: [voidEmbed],
            components: [],
        });
    } else if (action === 'edit') {
        // Show modal to edit duration
        const modal = new ModalBuilder()
            .setCustomId(`timeout.modal.${userId}`)
            .setTitle('Edit Timeout Duration');

        const durationInput = new TextInputBuilder()
            .setCustomId('duration')
            .setLabel('New Duration (e.g., 10m, 1h, 7d)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('10m');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason for Change')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Duration adjusted due to...');

        const durationRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            durationInput
        );
        const reasonRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            reasonInput
        );

        modal.addComponents(durationRow, reasonRow);

        await interaction.showModal(modal);
    }
};

export const handleTimeoutModalSubmit = async (interaction: any, client: Client) => {
    const userId = interaction.customId.split('.')[2];
    const newDurationStr = interaction.fields.getTextInputValue('duration');
    const changeReason = interaction.fields.getTextInputValue('reason');

    // Check if user is a mod
    const isMod = await isUserMod(client, interaction);
    if (!isMod) {
        return interaction.reply({
            content: 'You do not have permission to manage timeouts',
            ephemeral: true,
        });
    }

    // Parse new duration
    const durationMinutes = parseDuration(newDurationStr);
    if (durationMinutes === null) {
        return interaction.reply({
            content:
                'Invalid duration format. Please use formats like: 10m, 1h, 7d (m=minutes, h=hours, d=days)',
            ephemeral: true,
        });
    }

    const player = await Player.findOne({ discordId: userId });
    if (!player) {
        return interaction.reply({
            content: 'Player not found',
            ephemeral: true,
        });
    }

    // Update timeout
    const now = Date.now();
    const timeoutEnd = now + durationMinutes * 60 * 1000;

    await Player.updateOne(
        { discordId: userId },
        {
            $set: {
                banEnd: timeoutEnd,
                banTickDown: timeoutEnd,
            },
        }
    );

    botLog({
        messageContent: `<@${interaction.user.id}> edited timeout for <@${userId}> to ${formatDuration(durationMinutes)}. Reason: ${changeReason}`,
        client,
    });

    // Send DM to user
    try {
        await sendDirectMessage({
            client,
            userId: userId,
            message: `Your Breachers Ranked Matchmaking timeout has been updated to ${formatDuration(durationMinutes)}. Reason: ${changeReason}`,
        });
    } catch (error) {
        console.error('Failed to send DM to user:', error);
    }

    // Create updated embed
    const updatedEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('Timeout Updated')
        .addFields(
            { name: 'User', value: `<@${userId}>`, inline: true },
            { name: 'New Duration', value: formatDuration(durationMinutes), inline: true },
            { name: 'Updated By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: changeReason, inline: false }
        )
        .setTimestamp();

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`timeout.edit.${userId}`)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`timeout.void.${userId}`)
            .setLabel('Void')
            .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
        embeds: [updatedEmbed],
        components: [row],
        ephemeral: true,
    });
};
