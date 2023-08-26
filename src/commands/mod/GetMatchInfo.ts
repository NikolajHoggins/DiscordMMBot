import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Client,
    CommandInteraction,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../../Command.js';
import { isUserMod } from '../../helpers/permissions.js';
import Match from '../../models/match.schema.js';

export const GetMatchInfo: Command = {
    name: 'matchinfo',
    description: 'Get information about a match',
    type: ApplicationCommandType.ChatInput,
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
                    value: (match.teamARounds || 'N/A') as string,
                    inline: true,
                },
                {
                    name: 'Team B Rounds',
                    value: (match.teamBRounds || 'N/A') as string,
                    inline: true,
                },
                { name: 'Map', value: match.map || 'N/A', inline: true },
                { name: 'Region', value: match.region, inline: true }
            );
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
