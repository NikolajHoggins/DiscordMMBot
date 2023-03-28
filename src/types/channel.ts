export const ChannelsType = {
    'ranked-queue': 'ranked-queue',
    roles: 'roles',
    'bot-log': 'bot-log',
    leaderboard: 'leaderboard',
};

export type ChannelsType = typeof ChannelsType[keyof typeof ChannelsType];

export const CategoriesType = {
    matches: 'matches',
};

export type CategoriesType = typeof CategoriesType[keyof typeof CategoriesType];

export type ChannelType = {
    name: string;
    id: string;
};
