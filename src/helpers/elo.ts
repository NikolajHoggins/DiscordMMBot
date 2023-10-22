import { Client } from 'discord.js';
import { IMatch } from '../models/match.schema';
import { addWinLoss, get, idsToObjects } from '../services/player.service';
import { IPlayer, MatchResultType } from '../models/player.schema';
import { getTeam } from './players';
import { getWinScore } from '../services/system.service';
import { GameType, gameTypeRatingKeys } from '../types/queue';
import { getMatchWinner } from './match';

const calculateExpectedScore = (playerRating: number, opponentRating: number): number => {
    const ratingDifference = opponentRating - playerRating;
    const exponent = ratingDifference / 400;
    const expectedScore = 1 / (1 + 10 ** exponent);
    return expectedScore;
};

const calculateEloChange = (
    kFactor: number,
    playerRating: number,
    actualScore: number,
    expectedScore: number
): number => {
    const ratingDifference = actualScore - expectedScore;
    const eloChange = kFactor * ratingDifference;
    return eloChange;
};

const calculateTeamEloChange = ({
    winner,
    loser,
    winnerRounds,
    loserRounds,
    gameType,
}: {
    winner: IPlayer[];
    loser: IPlayer[];
    winnerRounds: number;
    loserRounds: number;
    gameType: GameType;
}) => {
    const K_FACTOR = 30;
    const MIN_ELO_GAIN = 10;
    const MAX_ELO_GAIN = 35;

    const ratingKey: 'rating' | 'duelsRating' = (
        gameType === GameType.duels
            ? gameTypeRatingKeys.duels.rating
            : gameTypeRatingKeys.squads.rating
    ) as 'rating' | 'duelsRating';

    const winnerRating = winner.reduce((sum, player) => sum + player[ratingKey], 0) / winner.length;
    console.log('winner rating', winnerRating);
    const loserRating = loser.reduce((sum, player) => sum + player[ratingKey], 0) / loser.length;
    console.log('loser rating', loserRating);

    const winnerExpectedScore = calculateExpectedScore(winnerRating, loserRating);
    const loserExpectedScore = calculateExpectedScore(loserRating, winnerRating);

    console.log('rating diff', winnerRating - loserRating);
    console.log('winner rating', winnerRating, winnerRounds);
    console.log('winner expected', winnerExpectedScore);
    console.log('loser rating', loserRating, loserRounds);
    console.log('loser expected', loserExpectedScore);
    // console.log('actual score', actualScore);
    const winnerChange = K_FACTOR * (1 - winnerExpectedScore);
    const loserChange = K_FACTOR * (1 - loserExpectedScore);

    const beforeCap = winnerChange * winnerRounds - loserChange * loserRounds;
    console.log('before cap', beforeCap);
    const actualChange = Math.max(Math.min(beforeCap, MAX_ELO_GAIN), MIN_ELO_GAIN);
    console.log('actual change', actualChange);
    return actualChange;
};

export const calculateEloChanges = async (match: IMatch, client: Client): Promise<any> => {
    const { players } = match;

    const winner = await getMatchWinner(match);
    const loser = winner === 'a' ? 'b' : 'a';
    const winnerHadAbandon = getTeam(players, winner).some(p => p.abandon);
    const loserHadAbandon = getTeam(players, loser).some(p => p.abandon);
    const winningTeam = await Promise.all(
        idsToObjects(
            getTeam(players, winner)
                .filter(p => !p.abandon)
                .map(p => p.id)
        )
    );
    const losingTeam = await Promise.all(
        idsToObjects(
            getTeam(players, loser)
                .filter(p => !p.abandon)
                .map(p => p.id)
        )
    );
    const winnerRounds = (winner === 'a' ? match.teamARounds : match.teamBRounds) || 0;
    const loserRounds = (loser === 'a' ? match.teamARounds : match.teamBRounds) || 0;

    const personChange = calculateTeamEloChange({
        winner: winningTeam,
        loser: losingTeam,
        winnerRounds,
        loserRounds,
        gameType: match.gameType,
    });

    const winnerPromises = getTeam(players, winner).map(p => {
        return new Promise(async resolve => {
            const player = await get(p.id);

            if (!player) return;

            // const expectedScore = calculateExpectedScore(player.rating, losingTeamAverageRating);
            // const actualScore = expectedScoreWinningTeam / winningTeam.length;

            let eloChange = personChange;

            let winStreak = 0;
            for (let i = player.history.length - 1; i >= 0; i--) {
                if (player.history[i].result === 'win') {
                    winStreak++;
                } else {
                    break;
                }
            }

            console.log('Default elo', eloChange);
            // let eloChange = K_FACTOR * (actualScore - expectedScoreForWinningTeam);

            const isUnranked = player.history.length < 10;
            console.log(player.name, 'isUnranked', isUnranked);
            console.log(player.name, 'elo before unranked', eloChange);
            if (isUnranked) {
                eloChange *= 1 + (10 - player.history.length + 2) / 10;
            }
            console.log(player.name, 'elo after unranked', eloChange);

            console.log(player.name, 'elo before multiplier', eloChange);
            if (winStreak > 1) {
                const multiplier = 1 + (winStreak - 1) * 0.05;
                eloChange *= multiplier;
            }
            console.log(player.name, 'elo after multiplier', eloChange);

            if (winnerHadAbandon) {
                eloChange += 10;
            }

            addWinLoss({
                playerId: p.id,
                matchNumber: match.match_number,
                ratingChange: eloChange,
                result: MatchResultType.win,
                client,
                gameType: match.gameType,
            });
            resolve(null);
        });
    });

    const loserMap = getTeam(players, loser).map(p => {
        return new Promise(async resolve => {
            const player = await get(p.id);
            if (!player) throw new Error(`Player ${p} doesn't exist`);

            let eloChange = personChange * -1 * 0.95;
            const isUnranked = player.history.length < 10;

            if (isUnranked) {
                eloChange *= 1 + (10 - player.history.length + 2) / 10;
            }

            if (loserHadAbandon) {
                eloChange += 10;
            }
            console.log(player.name, 'elo after unranked', eloChange);
            addWinLoss({
                playerId: p.id,
                matchNumber: match.match_number,
                ratingChange: eloChange,
                result: MatchResultType.loss,
                client,
                gameType: match.gameType,
            });
            resolve(null);
        });
    });

    await Promise.all([...winnerPromises, ...loserMap]);

    return true;
};
