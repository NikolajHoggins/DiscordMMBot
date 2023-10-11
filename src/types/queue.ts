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
