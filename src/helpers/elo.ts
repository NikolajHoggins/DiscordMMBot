import { Client } from 'discord.js';
import { IMatch } from '../models/match.schema';
import { addWinLoss, get, idsToObjects } from '../services/player.service';
import { IPlayer, MatchResultType } from '../models/player.schema';
import { getTeam } from './players';
import { GameType, gameTypeRatingKeys } from '../types/queue';
import { getConfig, getWinScore } from '../services/system.service';
import { getGuild } from './guild';
import { RanksType } from '../types/channel';

const calculateExpectedScore = (playerRating: number, opponentRating: number): number => {
    const ratingDifference = opponentRating - playerRating;
    const exponent = ratingDifference / 1000;
    const expectedScore = 1 / (1 + 10 ** exponent);
    return expectedScore;
};

export const calculateIndividualEloChange = ({
    ownTeam,
    enemyTeam,
    teamRounds,
    enemyRounds,
    gameType,
    maxScoreMargin,
}: {
    ownTeam: IPlayer[];
    enemyTeam: IPlayer[];
    teamRounds: number;
    enemyRounds: number;
    gameType: GameType;
    maxScoreMargin: number;
}) => {
    const BASE_K_FACTOR = 60; // For close matches
    const MAX_K_FACTOR = 90; // For dominant victories, ensures big gains for large score margins
    const MIN_GAIN_FOR_WIN = 2; // Adjusted to your lowest expected change
    let actualScore = teamRounds / (teamRounds + enemyRounds);

    const ratingKey: 'rating' | 'duelsRating' = (
        gameType === GameType.duels
            ? gameTypeRatingKeys.duels.rating
            : gameTypeRatingKeys.squads.rating
    ) as 'rating' | 'duelsRating';

    const teamRating = ownTeam.reduce((sum, player) => sum + player[ratingKey], 0) / ownTeam.length;

    const enemyRating =
        enemyTeam.reduce((sum, player) => sum + player[ratingKey], 0) / enemyTeam.length;

    const playerExpectedScore = calculateExpectedScore(teamRating, enemyRating);

    const scoreMargin = Math.abs(teamRounds - enemyRounds);

    const scoreMarginFactor = scoreMargin / maxScoreMargin; // This will be a value between 0 and 1.

    const dynamicKFactor = BASE_K_FACTOR + scoreMarginFactor * (MAX_K_FACTOR - BASE_K_FACTOR);

    // Calculate the potential change in rating, influenced by the dynamic K-factor.
    let newRatingChange = dynamicKFactor * (actualScore - playerExpectedScore);

    // Since actualScore is a value between 0 and 1, and playerExpectedScore is around 0.5 for equally strong teams,
    // the product might be too small. We ensure that for victories, there's a meaningful minimum change.

    if (teamRounds > enemyRounds) {
        return Math.max(newRatingChange, MIN_GAIN_FOR_WIN); // Minimum change for a win
    }

    return Math.min(newRatingChange, -MIN_GAIN_FOR_WIN); // Minimum change for a loss
};

export const calculateEloChanges = async (match: IMatch, client: Client): Promise<any> => {
    const { players } = match;
    const maxWinScore = match.gameType === GameType.squads ? await getWinScore() : 20;

    // Fetch context needed for ping role bonus once
    const config = await getConfig();
    const pingRoleId = config.roles.find(({ name }) => name === RanksType.ping)?.id;
    const guild = await getGuild(client);

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
                    ownTeam: p.team === 'a' ? teamA : teamB,
                    enemyTeam: p.team === 'a' ? teamB : teamA,
                    teamRounds,
                    enemyRounds,
                    gameType: match.gameType,
                    maxScoreMargin: maxWinScore,
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
                // Apply +0.5 bonus for winners with ping-to-play role
                if (isWin && pingRoleId) {
                    try {
                        const member = await guild.members.fetch(p.id);
                        if (member.roles.cache.has(pingRoleId)) {
                            eloChange += 0.5;
                            console.log('Applied ping role bonus +0.5');
                        }
                    } catch (e) {
                        console.error('Failed to fetch member for ping role bonus', e);
                    }
                }
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
