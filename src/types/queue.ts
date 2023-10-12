import { ChannelsType } from './channel';

export const RegionsType = {
    eu: 'eu',
    na: 'na',
    fill: 'fill',
} as const;

export type RegionsType = keyof typeof RegionsType;

export const GameType = {
    duels: 'duels',
    squads: 'squads',
} as const;

export type GameType = keyof typeof GameType;

export const gameTypeName = {
    [GameType.duels]: '1v1',
    [GameType.squads]: '5v5',
};

export const gameTypeReadyChannels = {
    [GameType.duels]: ChannelsType['duels-ready-up'],
    [GameType.squads]: ChannelsType['ready-up'],
};

export const gameTypeQueueChannels = {
    [GameType.duels]: ChannelsType['duels-queue'],
    [GameType.squads]: ChannelsType['ranked-queue'],
};

export const gameTypeResultsChannels = {
    [GameType.duels]: ChannelsType['duels-match-results'],
    [GameType.squads]: ChannelsType['match-results'],
};

export const gameTypePlayerCount = {
    [GameType.duels]: 2,
    [GameType.squads]: 10,
};

export const gameTypeLeaderboardChannels = {
    [GameType.duels]: ChannelsType['duels-leaderboard'],
    [GameType.squads]: ChannelsType['leaderboard'],
};

export const gameTypeRatingKeys = {
    [GameType.duels]: {
        rating: 'duelsRating',
        ratingHistory: 'duelsRatingHistory',
        history: 'duelsHistory',
    },
    [GameType.squads]: {
        rating: 'rating',
        ratingHistory: 'ratingHistory',
        history: 'history',
    },
};
