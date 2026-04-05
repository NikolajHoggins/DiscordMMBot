import { Client } from 'discord.js';
import Match from '../models/match.schema';

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
