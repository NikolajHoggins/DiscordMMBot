export const ChannelsType = {
    queue: 'queue',
    role: 'role',
};

export type ChannelsType = typeof ChannelsType[keyof typeof ChannelsType];

export type ChannelType = {
    name: string;
    id: string;
};
