import { IMatch } from '../models/match.schema.js';
import { addWinLoss, get, idsToObjects } from '../services/player.service.js';

export const calculateEloChanges = async (match: IMatch): Promise<boolean> => {
    console.log('starting elo calculation', match);
    const K_FACTOR = 40;
    const winner = match.teamARounds === 11 ? 'teamA' : 'teamB';
    const loser = winner === 'teamA' ? 'teamB' : 'teamA';

    const winningTeam = await Promise.all(idsToObjects(match[winner]));
    const losingTeam = await Promise.all(idsToObjects(match[loser]));

    const winningTeamAverageRating =
        winningTeam.reduce((sum, player) => sum + player.rating, 0) / winningTeam.length;

    const losingTeamAverageRating =
        losingTeam.reduce((sum, player) => sum + player.rating, 0) / losingTeam.length;

    const winnerRounds = (winner === 'teamA' ? match.teamARounds : match.teamBRounds) || 0;
    const loserRounds = (loser === 'teamA' ? match.teamARounds : match.teamBRounds) || 0;
    const totalRounds = winnerRounds + loserRounds;

    const expectedScoreForWinningTeam =
        (1 + 10 ** ((losingTeamAverageRating - winningTeamAverageRating) / 400)) ** -1;
    const expectedScoreForLosingTeam = 1 - expectedScoreForWinningTeam;

    const winnerPromises = match[winner].map(p => {
        return new Promise(async resolve => {
            const player = await get(p);

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
            if (winStreak > 1) {
                const multiplier = 1 + (winStreak - 1) * 0.1;
                eloChange *= multiplier;
            }

            addWinLoss({
                playerId: p,
                matchNumber: match.match_number,
                ratingChange: eloChange,
                won: false,
            });
            resolve(null);
        });
    });

    const loserMap = match[loser].map(p => {
        return new Promise(async resolve => {
            const player = await get(p);

            if (!player) throw new Error(`Player ${p} doesn't exist`);

            const actualScore = loserRounds / totalRounds;

            const eloChange = K_FACTOR * (actualScore - expectedScoreForLosingTeam);

            addWinLoss({
                playerId: p,
                matchNumber: match.match_number,
                ratingChange: eloChange,
                won: false,
            });
            resolve(null);
        });
    });

    await Promise.all([...winnerPromises, ...loserMap]);

    return true;
};
