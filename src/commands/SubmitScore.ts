import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    TextChannel,
    Channel,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import { getGuild } from '../helpers/guild';
import * as matchService from '../services/match.service';

export const SubmitScore: Command = {
    name: 'submit_score',
    description: 'Force end game lobby',
    options: [
        {
            name: 'score',
            description: 'score of your own team',
            type: ApplicationCommandOptionType.Number,
            max_value: 11,
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
            await interaction.followUp({
                ephemeral: true,
                content: 'Command only works in match thread',
            });
            return;
        }
        if (match.status === 'pending' || match.status === 'ended') {
            await interaction.followUp({
                ephemeral: true,
                content: 'Match not in started state',
            });
            return;
        }
        const matchPlayer = match.players.find(p => p.id === user.id);
        if (!matchPlayer) {
            await interaction.followUp({
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

        const content = `yes ${score?.value}`;

        await interaction.followUp({
            ephemeral: true,
            content,
        });
    },
};
