export const ChannelsType = {
    'ranked-queue': 'ranked-queue',
    'ready-up': 'ready-up',
    roles: 'roles',
    'bot-log': 'bot-log',
    leaderboard: 'leaderboard',
    region: 'region',
    'match-results': 'match-results',
    'bot-commands': 'bot-commands',
    'duels-queue': 'duels-queue',
    'duels-match-results': 'duels-match-results',
    'duels-ready-up': 'duels-ready-up',
    'duels-leaderboard': 'duels-leaderboard',
} as const;

export type ChannelsType = (typeof ChannelsType)[keyof typeof ChannelsType];

export const RanksType = {
    mod: 'mod',
    patreon: 'patreon',
    ping: 'ping',
    eu: 'eu',
    locked: 'locked',
    naw: 'naw',
    nae: 'nae',
    oce: 'oce',
    unranked: 'unranked',
    plastic: 'plastic',
    copper: 'copper',
    iron: 'iron',
    bronze: 'bronze',
    silver: 'silver',
    gold: 'gold',
    platinum: 'platinum',
    diamond: 'diamond',
    master: 'master',
} as const;

export type RanksType = (typeof RanksType)[keyof typeof RanksType];

export const CategoriesType = {
    matches: 'matches',
    duels: 'duels',
} as const;

export type CategoriesType = (typeof CategoriesType)[keyof typeof CategoriesType];

export const VCType = {
    members: 'members',
    'matches-played': 'matches-played',
    'players-playing': 'players-playing',
    'players-queue': 'players-queue',
};

export type VCType = (typeof VCType)[keyof typeof VCType];

export type ChannelType = {
    name: string;
    id: string;
};

export type RankType = {
    name: string;
    id: string;
};
