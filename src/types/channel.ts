export const ChannelsType = {
    'ranked-queue': 'ranked-queue',
    roles: 'roles',
};

export type ChannelsType = typeof ChannelsType[keyof typeof ChannelsType];

export type ChannelType = {
    name: string;
    id: string;
};
