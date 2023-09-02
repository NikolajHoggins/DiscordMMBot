import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Client,
    CommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
} from 'discord.js';
import { Command } from '../../Command';
import { isUserMod } from '../../helpers/permissions';
import Match from '../../models/match.schema';

export const GetMatchInfo: Command = {
    name: 'matchinfo',
    description: 'Get information about a match',
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: [PermissionFlagsBits.ManageMessages],
    options: [
        {
            name: 'match_number',
            description: 'The number of the match',
            type: ApplicationCommandOptionType.Integer,
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        if (!isUserMod(client, interaction)) return;

        const matchNumber = interaction.options.get('match_number')?.value as number;
        if (!matchNumber)
            return interaction.reply({ content: 'Match number not provided', ephemeral: true });

        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) return interaction.reply({ content: 'Match not found', ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Match #${match.match_number}`)
            .addFields(
                { name: 'Status', value: match.status, inline: true },
                {
                    name: 'Team A Rounds',
                    value: match.teamARounds ? `${match.teamARounds} rounds` : 'N/A',
                    inline: true,
                },
                {
                    name: 'Team B Rounds',
                    value: match.teamBRounds ? `${match.teamBRounds} rounds` : 'N/A',
                    inline: true,
                },
                { name: 'Map', value: match.map || 'N/A', inline: true },
                { name: 'Region', value: match.region, inline: true }
            );
        embed.addFields({
            name: 'Channels',
            value: match.channels
                ? `Ready: ${match.channels.ready}\nTeam A: ${match.channels.teamA}\nTeam B: ${match.channels.teamB}\nMatch Channel: ${match.channels.matchChannel}\nVoice: ${match.channels.voice}`
                : 'N/A',
        });

        match.players.forEach(player => {
            embed.addFields({
                name: player.name,
                value: `ID: ${player.id}\nTeam: ${player.team}\nRegion: ${
                    player.region
                }\nRating: ${Math.floor(player.rating)}\nCaptain: ${
                    player.captain ? 'Yes' : 'No'
                }\nVote: ${player.vote}\nReady: ${player.ready ? 'Yes' : 'No'}\nVerified Score: ${
                    player.verifiedScore ? 'Yes' : 'No'
                }\nAbandon: ${player.abandon ? 'Yes' : 'No'}\nReQueue: ${
                    player.reQueue ? 'Yes' : 'No'
                }\nQueue Time: ${player.queueTime}`,
                inline: true,
            });
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
