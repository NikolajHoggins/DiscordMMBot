import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    PermissionFlagsBits,
    EmbedBuilder,
    SlashCommandBuilder,
    SlashCommandBooleanOption,
    SlashCommandStringOption,
} from 'discord.js';

import { Command } from '../../Command';
import { getConfig, updateConfig } from '../../services/system.service';
import { ISystem } from '../../models/system.schema';

const TEAM_MODE_CHOICES = {
    random: 'random',
    balanced: 'balanced',
    captains: 'captains',
    autofill: 'autofill',
} as const;

const CAPTAIN_SELECTION_CHOICES = {
    twoHighestElo: 'two_highest_elo',
    twoLowestElo: 'two_lowest_elo',
    random: 'random',
    vote: 'vote',
} as const;

const DRAFT_TYPE_CHOICES = {
    snake: 'snake',
    straight: 'straight',
} as const;

const FIRST_PICK_CHOICES = {
    highestEloCaptain: 'highest_elo_captain',
    lowestEloCaptain: 'lowest_elo_captain',
    random: 'random',
} as const;

export const data = new SlashCommandBuilder()
    .setName('partyconfiguration')
    .setDescription('Configure queue match rules')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option: SlashCommandStringOption) =>
        option
            .setName('team_mode')
            .setDescription('How teams are created')
            .setRequired(false)
            .addChoices(
                { name: 'Random', value: TEAM_MODE_CHOICES.random },
                { name: 'Balanced (MMR based)', value: TEAM_MODE_CHOICES.balanced },
                { name: 'Captains (Drafting)', value: TEAM_MODE_CHOICES.captains },
                { name: 'Autofill', value: TEAM_MODE_CHOICES.autofill }
            )
    )
    .addStringOption((option: SlashCommandStringOption) =>
        option
            .setName('captain_selection')
            .setDescription('How captains are selected in captains mode')
            .setRequired(false)
            .addChoices(
                { name: 'Two Highest Elo', value: CAPTAIN_SELECTION_CHOICES.twoHighestElo },
                { name: 'Two Lowest Elo', value: CAPTAIN_SELECTION_CHOICES.twoLowestElo },
                { name: 'Random', value: CAPTAIN_SELECTION_CHOICES.random },
                { name: 'Vote', value: CAPTAIN_SELECTION_CHOICES.vote }
            )
    )
    .addStringOption((option: SlashCommandStringOption) =>
        option
            .setName('draft_type')
            .setDescription('Draft order type for captains mode')
            .setRequired(false)
            .addChoices(
                { name: 'Snake (1-2-2-1)', value: DRAFT_TYPE_CHOICES.snake },
                { name: 'Straight (1-1-1-1)', value: DRAFT_TYPE_CHOICES.straight }
            )
    )
    .addStringOption((option: SlashCommandStringOption) =>
        option
            .setName('first_pick')
            .setDescription('Who picks first in captains mode')
            .setRequired(false)
            .addChoices(
                { name: 'Highest Elo Captain', value: FIRST_PICK_CHOICES.highestEloCaptain },
                { name: 'Lowest Elo Captain', value: FIRST_PICK_CHOICES.lowestEloCaptain },
                { name: 'Random', value: FIRST_PICK_CHOICES.random }
            )
    )
    .addBooleanOption((option: SlashCommandBooleanOption) =>
        option
            .setName('auto_mute')
            .setDescription('Mute non-captains during the draft')
            .setRequired(false)
    );

const prettifyTeamMode = (value: string): string => {
    const labels: Record<string, string> = {
        [TEAM_MODE_CHOICES.random]: 'Random',
        [TEAM_MODE_CHOICES.balanced]: 'Balanced (MMR based)',
        [TEAM_MODE_CHOICES.captains]: 'Captains (Drafting)',
        [TEAM_MODE_CHOICES.autofill]: 'Autofill',
    };
    return labels[value] ?? value;
};

const prettifyCaptainSelection = (value: string): string => {
    const labels: Record<string, string> = {
        [CAPTAIN_SELECTION_CHOICES.twoHighestElo]: 'Two Highest Elo',
        [CAPTAIN_SELECTION_CHOICES.twoLowestElo]: 'Two Lowest Elo',
        [CAPTAIN_SELECTION_CHOICES.random]: 'Random',
        [CAPTAIN_SELECTION_CHOICES.vote]: 'Vote',
    };
    return labels[value] ?? value;
};

const prettifyDraftType = (value: string): string => {
    const labels: Record<string, string> = {
        [DRAFT_TYPE_CHOICES.snake]: 'Snake (1-2-2-1)',
        [DRAFT_TYPE_CHOICES.straight]: 'Straight (1-1-1-1)',
    };
    return labels[value] ?? value;
};

const prettifyFirstPick = (value: string): string => {
    const labels: Record<string, string> = {
        [FIRST_PICK_CHOICES.highestEloCaptain]: 'Highest Elo Captain',
        [FIRST_PICK_CHOICES.lowestEloCaptain]: 'Lowest Elo Captain',
        [FIRST_PICK_CHOICES.random]: 'Random',
    };
    return labels[value] ?? value;
};

export const execute = async (interaction: CommandInteraction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
            content: 'You need Manage Channels permission to use this command.',
            ephemeral: true,
        });
    }

    const teamMode = interaction.options.get('team_mode')?.value;
    const captainSelection = interaction.options.get('captain_selection')?.value;
    const draftType = interaction.options.get('draft_type')?.value;
    const firstPick = interaction.options.get('first_pick')?.value;
    const autoMute = interaction.options.get('auto_mute')?.value;

    if (
        teamMode === undefined &&
        captainSelection === undefined &&
        draftType === undefined &&
        firstPick === undefined &&
        autoMute === undefined
    ) {
        return interaction.reply({
            content: 'Please provide at least one option to update.',
            ephemeral: true,
        });
    }

    const config = await getConfig();
    const updates: Partial<ISystem> = {};

    if (typeof teamMode === 'string') updates.matchTeamMode = teamMode;
    if (typeof captainSelection === 'string') updates.matchCaptainSelection = captainSelection;
    if (typeof draftType === 'string') updates.matchDraftType = draftType;
    if (typeof firstPick === 'string') updates.matchFirstPick = firstPick;
    if (typeof autoMute === 'boolean') updates.matchAutoMute = autoMute;

    await updateConfig({ id: config._id, body: updates });

    const nextTeamMode =
        typeof updates.matchTeamMode === 'string' ? updates.matchTeamMode : config.matchTeamMode;
    const nextCaptainSelection =
        typeof updates.matchCaptainSelection === 'string'
            ? updates.matchCaptainSelection
            : config.matchCaptainSelection;
    const nextDraftType =
        typeof updates.matchDraftType === 'string' ? updates.matchDraftType : config.matchDraftType;
    const nextFirstPick =
        typeof updates.matchFirstPick === 'string' ? updates.matchFirstPick : config.matchFirstPick;
    const nextAutoMute =
        typeof updates.matchAutoMute === 'boolean' ? updates.matchAutoMute : config.matchAutoMute;

    const draftingIgnored =
        nextTeamMode !== TEAM_MODE_CHOICES.captains &&
        (captainSelection !== undefined ||
            draftType !== undefined ||
            firstPick !== undefined ||
            autoMute !== undefined);

    const embed = new EmbedBuilder()
        .setTitle('Match Rules Updated')
        .setColor('#57F287')
        .addFields(
            { name: 'Team Mode', value: prettifyTeamMode(nextTeamMode), inline: false },
            {
                name: 'Captain Selection',
                value: prettifyCaptainSelection(nextCaptainSelection),
                inline: true,
            },
            { name: 'Draft Type', value: prettifyDraftType(nextDraftType), inline: true },
            { name: 'First Pick', value: prettifyFirstPick(nextFirstPick), inline: true },
            { name: 'Auto Mute', value: nextAutoMute ? 'Enabled' : 'Disabled', inline: true }
        )
        .setFooter({ text: `Updated by ${interaction.user.tag}` })
        .setTimestamp();

    if (draftingIgnored) {
        embed.addFields({
            name: 'Note',
            value: 'Team mode is not set to Captains, so drafting settings are currently ignored.',
            inline: false,
        });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
};

const commandData = data.toJSON();

export const PartyConfiguration: Command = {
    name: commandData.name,
    description: commandData.description,
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageChannels],
    options: commandData.options as any,
    run: async (client: Client, interaction: CommandInteraction) => execute(interaction),
};
