import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import * as matchService from '../services/match.service';
import { capitalize, get } from 'lodash';
import { getTeam } from '../helpers/players.js';
import { getTeamBName } from '../helpers/team.js';

export const SubmitScore: Command = {
    name: 'submit_score',
    description: 'Force end game lobby',
    options: [
        {
            name: 'score',
            description: 'score of your own team',
            type: ApplicationCommandOptionType.Number,
            max_value: 7,
            min_value: 0,
            required: true,
        },
    ],
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;
        const score = interaction.options.get('score');

        const match = await matchService.findByChannelId(channelId);
        if (!match) {
            await interaction.reply({
                ephemeral: true,
                content: 'Command only works in match thread',
            });
            return;
        }
        if (match.status === 'pending' || match.status === 'ended') {
            await interaction.reply({
                ephemeral: true,
                content: 'Match not in started state',
            });
            return;
        }
        const matchPlayer = match.players.find(p => p.id === user.id);
        if (!matchPlayer) {
            await interaction.reply({
                ephemeral: true,
                content: 'You are not in this match',
            });
            return;
        }

        matchService.setScore({
            matchNumber: match.match_number,
            team: matchPlayer.team,
            score: score?.value as number,
            client,
        });

        const teamName =
            matchPlayer.team === 'a'
                ? capitalize(match.teamASide)
                : capitalize(getTeamBName(match.teamASide));

        const content = `Submitted score ${score?.value} for team ${teamName}`;

        await interaction.reply({
            content,
        });
    },
};
