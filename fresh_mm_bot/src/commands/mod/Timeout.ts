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
    TextChannel,
} from 'discord.js';
import { Command } from '../../Command';
import * as playerService from '../../services/player.service';
import * as enforcementService from '../../services/enforcement.service';
import { BansType } from '../../types/bans';
import { getChannelId } from '../../services/system.service';
import { ChannelsType } from '../../types/channel';
import { botLog, sendDirectMessage, sendMessageInChannel } from '../../helpers/messages';
import { isUserMod } from '../../helpers/permissions';
import { parseDuration, formatDuration } from '../../helpers/duration';

export const buildEnforcementEmbed = (enforcement: any, targetUser?: any): EmbedBuilder => {
    const isVoided = enforcement.status === 'voided';

    const embed = new EmbedBuilder()
        .setColor(isVoided ? '#808080' : '#FF0000')
        .setTitle(isVoided ? '~~Timeout~~ — VOIDED' : 'Timeout Applied')
        .addFields(
            {
                name: 'Target',
                value: `${enforcement.odDisplayName} (<@${enforcement.odId}>) | \`${enforcement.odId}\``,
                inline: false,
            },
            {
                name: 'Moderator',
                value: `<@${enforcement.modId}>`,
                inline: true,
            },
            {
                name: 'Duration',
                value: formatDuration(enforcement.durationMinutes),
                inline: true,
            },
            {
                name: 'Expires',
                value: `<t:${Math.floor(enforcement.expiresAt / 1000)}:R>`,
                inline: true,
            },
            {
                name: 'Reason',
                value: enforcement.reason,
                inline: false,
            },
            {
                name: 'Mod Notes',
                value: enforcement.modNotes || '*None*',
                inline: false,
            }
        )
        .setFooter({ text: `Enforcement ID: ${enforcement._id}` })
        .setTimestamp(enforcement.createdAt);

    if (isVoided) {
        embed.addFields(
            { name: 'Void Reason', value: enforcement.voidReason, inline: false },
            { name: 'Voided By', value: `<@${enforcement.voidedBy}>`, inline: true },
            {
                name: 'Voided At',
                value: `<t:${Math.floor(enforcement.voidedAt / 1000)}:F>`,
                inline: true,
            }
        );
    }

    if (enforcement.editHistory && enforcement.editHistory.length > 0) {
        const historyStr = enforcement.editHistory
            .map(
                (e: any) =>
                    `<t:${Math.floor(e.timestamp / 1000)}:f> — <@${e.modId}> changed **${e.field}**\n\`Before:\` ${e.oldValue}\n\`After:\` ${e.newValue}`
            )
            .join('\n\n');
        embed.addFields({ name: 'Edit History', value: historyStr, inline: false });
    }

    return embed;
};

export const buildEnforcementButtons = (
    enforcementId: string,
    disabled = false,
    durationMinutes?: number
) => {
    const editLabel =
        durationMinutes !== undefined ? `Edit (${formatDuration(durationMinutes)})` : 'Edit';
    return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`enforcement.edit.${enforcementId}`)
            .setLabel(editLabel)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`enforcement.void.${enforcementId}`)
            .setLabel('Void')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
};

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
            type: ApplicationCommandOptionType.String,
            name: 'notes',
            description: 'Internal mod notes (visible in logs & lookup)',
            required: false,
        },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: 'display',
            description: 'Send message in ranked queue channel about the ban',
            required: false,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;
        const reason = interaction.options.get('reason')?.value as string;
        const notes = (interaction.options.get('notes')?.value as string) || '';
        const display = interaction.options.get('display')?.value as boolean;
        const durationString = interaction.options.get('duration')?.value as string;

        if (!mention) return interaction.reply({ content: 'No user specified', ephemeral: true });
        if (!reason) return interaction.reply({ content: 'No reason provided', ephemeral: true });
        if (!durationString)
            return interaction.reply({ content: 'No duration provided', ephemeral: true });

        const durationMinutes = parseDuration(durationString);
        if (durationMinutes === null) {
            return interaction.reply({
                content:
                    'Invalid duration format. Use formats like: 10m, 1h, 7d (m=minutes, h=hours, d=days)',
                ephemeral: true,
            });
        }

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        // Apply ban on the player record + remove from queue
        await playerService.addBan({
            userId: mention.id,
            reason,
            duration: durationMinutes,
            modId: user.id,
            type: BansType.mod,
            client,
            display,
        });

        // Get display name
        let displayName = mention.username;
        try {
            const guild = interaction.guild;
            if (guild) {
                const member = await guild.members.fetch(mention.id);
                displayName = member.displayName;
            }
        } catch {}

        // Create enforcement record
        const enforcement = await enforcementService.createEnforcement({
            odId: mention.id,
            odDisplayName: displayName,
            modId: user.id,
            type: BansType.mod,
            durationMinutes,
            reason,
            modNotes: notes,
        });

        // DM the user
        try {
            await sendDirectMessage({
                client,
                userId: mention.id,
                message: `Your Ranked Matchmaking privileges have been disabled for ${formatDuration(durationMinutes)}. Reason: ${reason}`,
            });
        } catch (error) {
            console.error('Failed to send DM to user:', error);
        }

        // Build log embed and send to bot-log channel
        const embed = buildEnforcementEmbed(enforcement);
        const row = buildEnforcementButtons(
            enforcement._id.toString(),
            false,
            enforcement.durationMinutes
        );

        const logChannelId = await getChannelId(ChannelsType['bot-log']);
        const logMessage = await sendMessageInChannel({
            channelId: logChannelId,
            messageContent: { embeds: [embed], components: [row] },
            client,
        });

        // Save the log message reference so we can update it later
        await enforcementService.setLogMessage({
            enforcementId: enforcement._id.toString(),
            messageId: logMessage.id,
            channelId: logChannelId,
        });

        await interaction.reply({
            content: `Timeout applied to **${displayName}** (<@${mention.id}>) for ${formatDuration(durationMinutes)}. Enforcement logged.`,
            ephemeral: true,
        });
    },
};
