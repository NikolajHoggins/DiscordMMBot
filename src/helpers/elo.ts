import { Client } from 'discord.js';
import { IMatch } from '../models/match.schema.js';
import { addWinLoss, get, idsToObjects } from '../services/player.service.js';
import { MatchResultType } from '../models/player.schema.js';
import { getTeam } from './players.js';

export const calculateEloChanges = async (match: IMatch, client: Client): Promise<boolean> => {
    const { players } = match;

    const K_FACTOR = 200;

    const winner = match.teamARounds === 7 ? 'a' : 'b';
    const loser = winner === 'a' ? 'b' : 'a';

    const winningTeam = await Promise.all(idsToObjects(getTeam(players, winner).map(p => p.id)));
    const losingTeam = await Promise.all(idsToObjects(getTeam(players, loser).map(p => p.id)));

    const winningTeamAverageRating =
        winningTeam.reduce((sum, player) => sum + player.rating, 0) / winningTeam.length;

    const losingTeamAverageRating =
        losingTeam.reduce((sum, player) => sum + player.rating, 0) / losingTeam.length;

    const winnerRounds = (winner === 'a' ? match.teamARounds : match.teamBRounds) || 0;
    const loserRounds = (loser === 'a' ? match.teamARounds : match.teamBRounds) || 0;

    const totalRounds = winnerRounds + loserRounds;

    const expectedScoreForWinningTeam =
        (1 + 10 ** ((losingTeamAverageRating - winningTeamAverageRating) / 400)) ** -1;
    const expectedScoreForLosingTeam = 1 - expectedScoreForWinningTeam;

    const winnerPromises = getTeam(players, winner).map(p => {
        return new Promise(async resolve => {
            const player = await get(p.id);

            if (!player) return;

            const actualScore = winnerRounds / totalRounds;

            let winStreak = 0;
            for (let i = player.history.length - 1; i >= 0; i--) {
                if (player.history[i].result === 'win') {
                    winStreak++;
                } else {
                    break;
                }
            }

            let eloChange = K_FACTOR * (actualScore - expectedScoreForWinningTeam);

            const isUnranked = player.history.length < 10;
            console.log('isUnranked', isUnranked);
            console.log('elo before unranked', eloChange);
            if (isUnranked) {
                eloChange *= 2;
            }
            console.log('elo after unranked', eloChange);

            console.log('elo before multiplier', eloChange);
            if (winStreak > 1) {
                const multiplier = 1 + (winStreak - 1) * 0.1;
                eloChange *= multiplier;
            }
            console.log('elo after multiplier', eloChange);

            addWinLoss({
                playerId: p.id,
                matchNumber: match.match_number,
                ratingChange: eloChange,
                result: MatchResultType.win,
                client,
            });
            resolve(null);
        });
    });

    const loserMap = getTeam(players, loser).map(p => {
        return new Promise(async resolve => {
            const player = await get(p.id);
            if (!player) throw new Error(`Player ${p} doesn't exist`);

            const actualScore = loserRounds / totalRounds;

            let eloChange = K_FACTOR * (actualScore - expectedScoreForLosingTeam);
            const isUnranked = player.history.length < 10;
            console.log('isUnranked', isUnranked);
            console.log('elo before unranked', eloChange);
            if (isUnranked) {
                eloChange *= 2;
            }
            console.log('elo after unranked', eloChange);
            addWinLoss({
                playerId: p.id,
                matchNumber: match.match_number,
                ratingChange: eloChange,
                result: MatchResultType.loss,
                client,
            });
            resolve(null);
        });
    });

    await Promise.all([...winnerPromises, ...loserMap]);

    return true;
};
