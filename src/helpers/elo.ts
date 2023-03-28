import { IMatch } from '../models/match.schema.js';

interface Result {
    winningTeam: IPlayer[];
    losingTeam: IPlayer[];
    winningRounds: number;
    losingRounds: number;
}

function calculateEloChanges(match: IMatch): { [key: number]: number } {
    const K_FACTOR = 40;

    const winningTeamAverageRating =
        result.winningTeam.reduce((sum, player) => sum + player.rating, 0) /
        result.winningTeam.length;

    const losingTeamAverageRating =
        result.losingTeam.reduce((sum, player) => sum + player.rating, 0) /
        result.losingTeam.length;

    const totalRounds = result.winningRounds + result.losingRounds;
    const expectedScoreForWinningTeam =
        (1 + 10 ** ((losingTeamAverageRating - winningTeamAverageRating) / 400)) ** -1;
    const expectedScoreForLosingTeam = 1 - expectedScoreForWinningTeam;

    const eloChanges: { [key: number]: number } = {};

    result.winningTeam.forEach(player => {
        const rating = player.rating;
        const actualScore = result.winningRounds / totalRounds;

        let winStreak = 0;
        for (let i = player.history.length - 1; i >= 0; i--) {
            if (player.history[i] === 'win') {
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

        eloChanges[rating] = eloChange;
    });

    result.losingTeam.forEach(player => {
        const rating = player.rating;
        const actualScore = result.losingRounds / totalRounds;

        const eloChange = K_FACTOR * (actualScore - expectedScoreForLosingTeam);
        eloChanges[rating] = eloChange;
    });

    return eloChanges;
}
