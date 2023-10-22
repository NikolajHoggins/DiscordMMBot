import { Client } from 'discord.js';
import { IMatch } from '../models/match.schema';
import { addWinLoss, get, idsToObjects } from '../services/player.service';
import { IPlayer, MatchResultType } from '../models/player.schema';
import { getTeam } from './players';
import { GameType, gameTypeRatingKeys } from '../types/queue';
import { repeat } from 'lodash';

const calculateExpectedScore = (playerRating: number, opponentRating: number): number => {
    const ratingDifference = opponentRating - playerRating;
    const exponent = ratingDifference / 100;
    const expectedScore = 1 / (1 + 10 ** exponent);
    return expectedScore;
};

const calculateIndividualEloChange = ({
    player,
    enemyTeam,
    teamRounds,
    enemyRounds,
    gameType,
}: {
    player: IPlayer;
    enemyTeam: IPlayer[];
    teamRounds: number;
    enemyRounds: number;
    gameType: GameType;
}) => {
    const K_FACTOR = 40;
    const MIN_GAIN_FOR_WIN = 5;
    let actualScore = teamRounds / (teamRounds + enemyRounds);

    const ratingKey: 'rating' | 'duelsRating' = (
        gameType === GameType.duels
            ? gameTypeRatingKeys.duels.rating
            : gameTypeRatingKeys.squads.rating
    ) as 'rating' | 'duelsRating';

    console.log(repeat('=', 20));
    const playerRating = player[ratingKey];
    console.log('Player rating', playerRating);
    const enemyRating =
        enemyTeam.reduce((sum, player) => sum + player[ratingKey], 0) / enemyTeam.length;
    console.log('enemy rating', enemyRating);

    const playerExpectedScore = calculateExpectedScore(playerRating, enemyRating);

    const newRating = K_FACTOR * (actualScore - playerExpectedScore);

    return teamRounds > enemyRounds ? Math.max(newRating, MIN_GAIN_FOR_WIN) : newRating;
};

export const calculateEloChanges = async (match: IMatch, client: Client): Promise<any> => {
    const { players } = match;

    const teamA = await Promise.all(
        idsToObjects(
            getTeam(players, 'a')
                .filter(p => !p.abandon)
                .map(p => p.id)
        )
    );
    const teamB = await Promise.all(
        idsToObjects(
            getTeam(players, 'b')
                .filter(p => !p.abandon)
                .map(p => p.id)
        )
    );

    await Promise.all(
        match.players.map(p => {
            return new Promise(async resolve => {
                const player = await get(p.id);

                const teamHasAbandon = getTeam(players, p.team).some(p => p.abandon);

                if (!player) throw new Error(`Player ${p} doesn't exist`);

                const teamRounds = (p.team === 'a' ? match.teamARounds : match.teamBRounds) || 0;
                const enemyRounds = (p.team === 'a' ? match.teamBRounds : match.teamARounds) || 0;
                let eloChange = calculateIndividualEloChange({
                    player,
                    enemyTeam: p.team === 'a' ? teamB : teamA,
                    teamRounds,
                    enemyRounds,
                    gameType: match.gameType,
                });
                console.log('eloChange', eloChange);

                if (teamHasAbandon) {
                    eloChange += 10;
                }
                console.log('eloChange after abandon', eloChange);

                let winStreak = 0;
                for (let i = player.history.length - 1; i >= 0; i--) {
                    if (player.history[i].result === 'win') {
                        winStreak++;
                    } else {
                        break;
                    }
                }

                const isWin = teamRounds > enemyRounds;

                if (isWin && winStreak > 1) {
                    const multiplier = 1 + (winStreak - 1) * 0.05;
                    eloChange *= multiplier;
                }

                console.log('eloChange after win streak', eloChange);
                const historyKey = (
                    match.gameType === GameType.duels
                        ? gameTypeRatingKeys.duels.history
                        : gameTypeRatingKeys.squads.history
                ) as 'history' | 'duelsHistory';

                const isUnranked = player[historyKey].length < 10;
                console.log(player.name, 'isUnranked', isUnranked);
                console.log(player.name, 'elo before unranked', eloChange);
                if (isUnranked) {
                    eloChange *= 1 + (10 - player[historyKey].length + 2) / 10;
                }
                console.log(player.name, 'elo after unranked', eloChange);

                addWinLoss({
                    playerId: p.id,
                    matchNumber: match.match_number,
                    ratingChange: eloChange,
                    result: isWin ? MatchResultType.win : MatchResultType.loss,
                    client,
                    gameType: match.gameType,
                });

                console.log(`player ${player.name} elo change - ${eloChange}`);
            });
        })
    );

    return true;
};
