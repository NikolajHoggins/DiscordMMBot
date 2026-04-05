import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    EmbedBuilder,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder,
} from 'discord.js';
import { Command } from '../../Command';
import * as playerService from '../../services/player.service';
import { getGuild } from '../../helpers/guild';
import { BansType } from '../../types/bans';
import { getConfig } from '../../services/system.service';
import { RanksType } from '../../types/channel';
import { botLog, sendDirectMessage } from '../../helpers/messages';
import { isUserMod } from '../../helpers/permissions';
import { parseDuration, formatDuration } from '../../helpers/duration';

export const Timeout: Command = {
    name: 'timeout',
    description: 'Stop a player from queueing for given time',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: 'user',
            description: 'User to timeout',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: 'duration',
            description: 'Timeout duration (e.g., 10m, 1h, 7d)',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: 'reason',
            description: 'Reason for timeout',
            required: true,
        },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: 'display',
            description:
                'Send message in ranked queue channel, defaults to not sending message about ban',
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const reason = interaction.options.get('reason')?.value as string;
        const display = interaction.options.get('display')?.value as boolean;
        const durationString = interaction.options.get('duration')?.value as string;

        if (!mention) return interaction.reply({ content: 'No user specified', ephemeral: true });
        if (!reason) return interaction.reply({ content: 'No reason provided', ephemeral: true });
        if (!durationString)
            return interaction.reply({ content: 'No duration provided', ephemeral: true });

        // Parse duration
        const durationMinutes = parseDuration(durationString);
        if (durationMinutes === null) {
            return interaction.reply({
                content:
                    'Invalid duration format. Please use formats like: 10m, 1h, 7d (m=minutes, h=hours, d=days)',
                ephemeral: true,
            });
        }

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        // Add ban and remove from queue
        await playerService.addBan({
            userId: mention.id,
            reason: reason,
            duration: durationMinutes,
            modId: user.id,
            type: BansType.mod,
            client,
            display: display,
        });

        // Send DM to user
        try {
            await sendDirectMessage({
                client,
                userId: mention.id,
                message: `Your Breachers Ranked Matchmaking privileges have been disabled for ${formatDuration(durationMinutes)}. Reason: ${reason}`,
            });
        } catch (error) {
            console.error('Failed to send DM to user:', error);
        }

        // Create interactive embed with buttons
        const timeoutEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Timeout Applied')
            .addFields(
                { name: 'User', value: `<@${mention.id}>`, inline: true },
                { name: 'Duration', value: formatDuration(durationMinutes), inline: true },
                { name: 'Moderator', value: `<@${user.id}>`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setTimestamp();

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`timeout.edit.${mention.id}`)
                .setLabel('Edit')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`timeout.void.${mention.id}`)
                .setLabel('Void')
                .setStyle(ButtonStyle.Danger)
        );

        botLog({
            messageContent: `<@${user.id}> timed out <@${mention.id}> for ${formatDuration(durationMinutes)}. Reason: ${reason}`,
            client,
        });

        await interaction.reply({
            embeds: [timeoutEmbed],
            components: [row],
            ephemeral: true,
        });
    },
};
