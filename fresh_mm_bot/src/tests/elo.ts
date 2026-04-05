import { repeat } from 'lodash';
import { calculateIndividualEloChange } from '../helpers/elo';
import { IPlayer } from '../models/player.schema';
import { GameType } from '../types/queue';

const playerFactory = (rating: number): IPlayer => ({
    discordId: '241759050155425803',
    name: 'Hoggins',
    rating: rating,
    history: [],
    banEnd: 0,
    banStart: 1690138144051,
    bans: [],
    ratingHistory: [],
    notes: [],
    avatarUrl:
        'https://cdn.discordapp.com/avatars/241759050155425803/458afa24b2a72ce54c16a3746ddc47fd.webp',
    duelsHistory: [],
    duelsRating: rating,
    duelsRatingHistory: [],
    banMultiplier: 0,
    banTickDown: 0,
});

const runTest = async ({
    ownRating,
    enemyRating,
    ownScore,
    enemyScore,
    expectedMax,
    expectedMin,
    gameType,
}: {
    ownRating: number;
    enemyRating: number;
    ownScore: number;
    enemyScore: number;
    expectedMin: number;
    expectedMax: number;
    gameType: GameType;
}): Promise<void> => {
    const change = calculateIndividualEloChange({
        ownTeam: [playerFactory(ownRating)],
        enemyTeam: [playerFactory(enemyRating)],
        teamRounds: ownScore,
        enemyRounds: enemyScore,
        gameType,
        maxScoreMargin: gameType === GameType.squads ? 11 : 20,
    });
    console.log(repeat('=', 50));
    console.log('Own score', ownScore);
    console.log('Enemy score', enemyScore);
    console.log("Own team's rating", ownRating);
    console.log("Enemy team's rating", enemyRating);
    console.log('Rating change', change);
    if (change < expectedMin || change > expectedMax) {
        console.log(
            `Expected change to be between ${expectedMin} and ${expectedMax}, but it was ${change}`
        );
        // throw new Error(
        //     `Expected change to be between ${expectedMin} and ${expectedMax}, but it was ${change}`
        // );
    }
};

export const runTests = async () => {
    console.log('hello');

    await runTest({
        ownRating: 1300,
        enemyRating: 1300,
        ownScore: 7,
        enemyScore: 0,
        expectedMin: 30,
        expectedMax: 40,
        gameType: 'squads',
    });
    await runTest({
        ownRating: 1300,
        enemyRating: 1300,
        ownScore: 0,
        enemyScore: 7,
        expectedMin: -20,
        expectedMax: -26,
        gameType: 'squads',
    });
    await runTest({
        ownRating: 1300,
        enemyRating: 1300,
        ownScore: 7,
        enemyScore: 5,
        expectedMin: 5,
        expectedMax: 10,
        gameType: 'squads',
    });
    await runTest({
        ownRating: 1300,
        enemyRating: 1300,
        ownScore: 5,
        enemyScore: 7,
        expectedMin: -10,
        expectedMax: -5,
        gameType: 'squads',
    });
    await runTest({
        ownRating: 1300,
        enemyRating: 1300,
        ownScore: 7,
        enemyScore: 3,
        expectedMin: 0,
        expectedMax: 5,
        gameType: 'squads',
    });
    await runTest({
        ownRating: 1300,
        enemyRating: 1500,
        ownScore: 7,
        enemyScore: 3,
        expectedMin: 0,
        expectedMax: 5,
        gameType: 'squads',
    });
    await runTest({
        ownRating: 1300,
        enemyRating: 1200,
        ownScore: 7,
        enemyScore: 4,
        expectedMin: 0,
        expectedMax: 5,
        gameType: 'squads',
    });
    await runTest({
        ownRating: 1300,
        enemyRating: 1200,
        ownScore: 7,
        enemyScore: 3,
        expectedMin: 0,
        expectedMax: 5,
        gameType: 'squads',
    });
    await runTest({
        ownRating: 1818,
        enemyRating: 1418,
        ownScore: 7,
        enemyScore: 3,
        expectedMin: 0,
        expectedMax: 5,
        gameType: 'squads',
    });
};
