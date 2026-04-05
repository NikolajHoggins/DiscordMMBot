import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import * as matchService from '../services/match.service';
import { capitalize } from 'lodash';
import { getTeamBName } from '../helpers/team';
import { MatchStatus } from '../models/match.schema';
import { getWinScore } from '../services/system.service';
import { GameType } from '../types/queue';
import { safelyReplyToInteraction } from '../helpers/interactions';

export const SubmitScore: Command = {
    name: 'submit_score',
    description: 'Force end game lobby',
    options: [
        {
            name: 'score',
            description: 'score of your own team',
            type: ApplicationCommandOptionType.Number,
            max_value: 20,
            min_value: 0,
            required: true,
        },
    ],
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        //fetch player from database
        const { user, channelId } = interaction;
        const score = interaction.options.get('score')?.value as number;

        const match = await matchService.findByChannelId(channelId);
        if (!match) {
            await safelyReplyToInteraction({
                interaction,
                ephemeral: true,
                content: 'Command only works in match thread',
            });
            return;
        }
        const winScore = match.gameType === GameType.squads ? await getWinScore() : 20;

        if (score > winScore) {
            await safelyReplyToInteraction({
                interaction,
                ephemeral: true,
                content: `Score can be a maximum of ${winScore}`,
            });
            return;
        }

        if (match.status !== MatchStatus.started) {
            await safelyReplyToInteraction({
                interaction,
                ephemeral: true,
                content: 'Match not in started state',
            });
            return;
        }
        const matchPlayer = match.players.find(p => p.id === user.id);
        if (!matchPlayer) {
            await safelyReplyToInteraction({
                interaction,
                ephemeral: true,
                content: 'You are not in this match',
            });
            return;
        }
        if (!matchPlayer.captain) {
            await safelyReplyToInteraction({
                interaction,
                ephemeral: true,
                content: 'You are not the captain',
            });
            return;
        }

        matchService.setScore({
            matchNumber: match.match_number,
            team: matchPlayer.team,
            score: score as number,
            client,
        });

        const teamName =
            matchPlayer.team === 'a'
                ? capitalize(match.teamASide)
                : capitalize(await getTeamBName(match.teamASide));

        const content = `Submitted score ${score} for team ${teamName}`;

        await safelyReplyToInteraction({
            interaction,
            content,
        });
    },
};
