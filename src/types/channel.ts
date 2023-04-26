export const ChannelsType = {
    'ranked-queue': 'ranked-queue',
    'ready-up': 'ready-up',
    roles: 'roles',
    'bot-log': 'bot-log',
    leaderboard: 'leaderboard',
    region: 'region',
    'match-results': 'match-results',
    'bot-commands': 'bot-commands',
} as const;

export type ChannelsType = (typeof ChannelsType)[keyof typeof ChannelsType];

export const RanksType = {
    mod: 'mod',
    ping: 'ping',
    eu: 'eu',
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
} as const;

export type CategoriesType = (typeof CategoriesType)[keyof typeof CategoriesType];

export const VCType = {
    members: 'members',
    'matches-played': 'matches-played',
    'players-playing': 'players-playing',
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
