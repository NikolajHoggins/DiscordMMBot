import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder,
    SelectMenuBuilder,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
} from 'discord.js';
import { Command } from '../../Command';
import { getGuild } from '../../helpers/guild';
import { botLog, sendMessage } from '../../helpers/messages';

import * as matchService from '../../services/match.service';
import Match from '../../models/match.schema';
import { RanksType } from '../../types/channel';
import { getConfig } from '../../services/system.service';
import { isUserMod } from '../../helpers/permissions';

export const TestMVP: Command = {
    name: 'test_mvp',
    description: 'test MVP embed',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            name: 'match_number',
            description: 'Match number',
            type: ApplicationCommandOptionType.Integer,
            required: false,
        },
    ],

    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;

        const guild = await getGuild(client);
        const member = await guild?.members.fetch(user.id);
        const matchNumber = interaction.options.get('match_number')?.value as number;

        if (!member) return;

        const isMod = await isUserMod(client, interaction);
        if (!isMod) return;

        //find match with channelId
        const match = matchNumber
            ? await Match.findOne({ match_number: matchNumber })
            : await matchService.findByChannelId(channelId);

        const content = match ? 'Done' : 'Not in match thread';

        await interaction.reply({
            ephemeral: true,
            content,
        });
        if (!match) return;

        const mvpEmbed = new EmbedBuilder()
            .setTitle(`MVP Voting for match #${match.match_number}`)
            .setDescription(
                'Select the MVP from the dropdown below. You can only vote for one person, and on your own team.'
            )
            .setTimestamp();

        const teamADropDown = new SelectMenuBuilder()
            .setCustomId('mvp-team-a')
            .setPlaceholder('Team A')
            .addOptions(
                match.players
                    .filter(player => player.team === 'a')
                    .map(player => ({
                        label: player.name,
                        value: player.id,
                    }))
            );

        const teamBDropDown = new SelectMenuBuilder()
            .setCustomId('mvp-team-b')
            .setPlaceholder('Team B')
            .addOptions(
                match.players
                    .filter(player => player.team === 'b')
                    .map(player => ({
                        label: player.name,
                        value: player.id,
                    }))
            );

        const mvpRowTeamA = new ActionRowBuilder<MessageActionRowComponentBuilder>();
        mvpRowTeamA.addComponents(teamADropDown);

        const mvpRowTeamB = new ActionRowBuilder<MessageActionRowComponentBuilder>();
        mvpRowTeamB.addComponents(teamBDropDown);

        const mvpContent = {
            content: 'This is work in progress',
            embeds: [mvpEmbed],
            components: [mvpRowTeamA, mvpRowTeamB],
        };

        await sendMessage({
            channelId: match.channels.matchChannel,
            messageContent: mvpContent,
            client,
        });
    },
};
