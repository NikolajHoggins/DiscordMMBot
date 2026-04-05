import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageActionRowComponentBuilder,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../Command';
import { safelyReplyToInteraction } from '../helpers/interactions';
import * as partyService from '../services/party.service';

export const PartyCommand: Command = {
    name: 'party',
    description: 'Manage your party',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'create',
            description: 'Create a new party',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'name',
                    description: 'Party name',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
        {
            name: 'invite',
            description: 'Invite a user to your party',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'User to invite',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
        {
            name: 'leave',
            description: 'Leave your current party',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'disband',
            description: 'Disband your party (leader only)',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'info',
            description: 'View your current party',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const subcommand = interaction.options.data[0]?.name;

        switch (subcommand) {
            case 'create':
                return handleCreate(interaction);
            case 'invite':
                return handleInvite(client, interaction);
            case 'leave':
                return handleLeave(interaction);
            case 'disband':
                return handleDisband(interaction);
            case 'info':
                return handleInfo(interaction);
            default:
                return safelyReplyToInteraction({
                    interaction,
                    content: 'Unknown subcommand',
                    ephemeral: true,
                });
        }
    },
};

const handleCreate = async (interaction: CommandInteraction) => {
    const name = interaction.options.get('name', true).value as string;

    if (name.length > 32) {
        return safelyReplyToInteraction({
            interaction,
            content: 'Party name must be 32 characters or fewer',
            ephemeral: true,
        });
    }

    try {
        const party = await partyService.createParty(name, interaction.user.id);
        const embed = new EmbedBuilder()
            .setTitle(`Party Created: ${party.name}`)
            .setDescription(`Leader: <@${party.leaderId}>`)
            .setColor(0x57f287);

        return safelyReplyToInteraction({ interaction, embeds: [embed], ephemeral: true });
    } catch (error: any) {
        return safelyReplyToInteraction({
            interaction,
            content: error.message,
            ephemeral: true,
        });
    }
};

const handleInvite = async (client: Client, interaction: CommandInteraction) => {
    const targetUser = interaction.options.getUser('user', true);

    if (targetUser.id === interaction.user.id) {
        return safelyReplyToInteraction({
            interaction,
            content: 'You cannot invite yourself',
            ephemeral: true,
        });
    }

    if (targetUser.bot) {
        return safelyReplyToInteraction({
            interaction,
            content: 'You cannot invite a bot',
            ephemeral: true,
        });
    }

    const party = await partyService.findPartyByMember(interaction.user.id);
    if (!party) {
        return safelyReplyToInteraction({
            interaction,
            content: 'You are not in a party. Create one with `/party create`',
            ephemeral: true,
        });
    }

    if (party.leaderId !== interaction.user.id) {
        return safelyReplyToInteraction({
            interaction,
            content: 'Only the party leader can invite players',
            ephemeral: true,
        });
    }

    const targetParty = await partyService.findPartyByMember(targetUser.id);
    if (targetParty) {
        return safelyReplyToInteraction({
            interaction,
            content: `<@${targetUser.id}> is already in a party`,
            ephemeral: true,
        });
    }

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`partyInvite.accept.${party.name}.${targetUser.id}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`partyInvite.decline.${party.name}.${targetUser.id}`)
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
        .setTitle('Party Invite')
        .setDescription(
            `You have been invited to join **${party.name}** by <@${interaction.user.id}>`
        )
        .setColor(0x5865f2);

    // DM the invite to the target player
    try {
        await targetUser.send({ embeds: [embed], components: [row] });
    } catch {
        return safelyReplyToInteraction({
            interaction,
            content: `Could not DM <@${targetUser.id}> — they may have DMs disabled.`,
            ephemeral: true,
        });
    }

    return safelyReplyToInteraction({
        interaction,
        content: `Invite sent to <@${targetUser.id}> via DM!`,
        ephemeral: true,
    });
};

const handleLeave = async (interaction: CommandInteraction) => {
    try {
        const party = await partyService.removeMember(interaction.user.id);
        return safelyReplyToInteraction({
            interaction,
            content: `You left **${party?.name}**`,
            ephemeral: true,
        });
    } catch (error: any) {
        return safelyReplyToInteraction({
            interaction,
            content: error.message,
            ephemeral: true,
        });
    }
};

const handleDisband = async (interaction: CommandInteraction) => {
    try {
        const name = await partyService.disbandParty(interaction.user.id);
        return safelyReplyToInteraction({
            interaction,
            content: `Party **${name}** has been disbanded`,
            ephemeral: true,
        });
    } catch (error: any) {
        return safelyReplyToInteraction({
            interaction,
            content: error.message,
            ephemeral: true,
        });
    }
};

const handleInfo = async (interaction: CommandInteraction) => {
    const party = await partyService.findPartyByMember(interaction.user.id);
    if (!party) {
        return safelyReplyToInteraction({
            interaction,
            content: 'You are not in a party',
            ephemeral: true,
        });
    }

    const memberList = party.members.map(m => `<@${m}>`).join('\n');
    const embed = new EmbedBuilder()
        .setTitle(`Party: ${party.name}`)
        .addFields(
            { name: 'Leader', value: `<@${party.leaderId}>`, inline: true },
            { name: 'Members', value: memberList, inline: true }
        )
        .setColor(0x5865f2);

    return safelyReplyToInteraction({ interaction, embeds: [embed], ephemeral: true });
};
