import {
    CommandInteraction,
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord.js';
import { Command } from '../Command';
import Match, { MatchStatus } from '../models/match.schema';

export const VoteMVP: Command = {
    name: 'vote_mvp',
    description: 'Vote for a player to be MVP',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.Mentionable,
            name: 'user',
            description: 'User to vote as MVP',
            required: true,
        },
    ],
    run: async (client: Client, interaction: CommandInteraction) => {
        const { user } = interaction;
        const mention = interaction.options.get('user')?.user;

        if (!mention) return interaction.reply({ content: 'no mention' });

        //find active match with user
        const match = await Match.findOne({ 'players.id': user.id, status: MatchStatus.started });

        if (!match) {
            interaction.reply({ content: 'You are not in an active match', ephemeral: true });
            return;
        }

        if (!match.players.find(p => p.id === mention?.id)) {
            interaction.reply({ content: 'User is not in your match', ephemeral: true });
            return;
        }

        const ownTeam = match.players.find(p => p.id === user.id)?.team;
        if (!ownTeam) {
            interaction.reply({ content: 'You are not in a team', ephemeral: true });
            return;
        }

        const otherTeam = match.players.find(p => p.id === mention?.id)?.team;

        if (ownTeam !== otherTeam) {
            interaction.reply({ content: 'User is not in your team', ephemeral: true });
            return;
        }

        setPlayerMvpVote({
            playerId: user.id,
            matchNumber: match.match_number,
            client,
            mvpVoteId: mention.id,
        });

        interaction.reply({ content: `Voted <@${mention.id}> as mvp`, ephemeral: true });

        return;
    },
};

export const setPlayerMvpVote = ({
    playerId,
    matchNumber,
    client,
    mvpVoteId,
}: {
    playerId: string;
    matchNumber: number;
    client: Client;
    mvpVoteId: string;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });

        if (!match) throw new Error('Match not found');

        const result = await Match.updateOne(
            {
                match_number: match.match_number,
                'players.id': playerId,
                version: match.version,
            },
            { $set: { 'players.$.mvpVoteId': mvpVoteId }, $inc: { version: 1 } }
        );
        if (result.modifiedCount === 0) {
            console.log('Player mvp vote conflict, retrying');
            setTimeout(() => {
                setPlayerMvpVote({ playerId, matchNumber, client, mvpVoteId });
            }, 1000);
            return;
        }

        resolve(true);
    });
};
