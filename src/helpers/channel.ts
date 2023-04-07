import { Channel, ChannelType, Client, PermissionsBitField } from 'discord.js';
import { getEveryoneRole, getGuild } from './guild.js';

export const createChannel = ({
    client,
    name,
    parentId,
    allowedIds,
    type = ChannelType.GuildText,
}: {
    client: Client;
    name: string;
    allowedIds: string[];
    parentId?: string;
    type?: ChannelType.GuildText | ChannelType.GuildVoice;
}): Promise<Channel> => {
    return new Promise(async resolve => {
        const guild = await getGuild(client);

        const everyoneRole = await getEveryoneRole(client);

        const channel = await guild.channels.create({
            name: name,
            type: type,
            permissionOverwrites: [
                {
                    id: everyoneRole.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                ...allowedIds.map(id => ({
                    id: id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                })),
                ...(process.env.MOD_ROLE_ID
                    ? [
                          {
                              id: process.env.MOD_ROLE_ID,
                              allow: [PermissionsBitField.Flags.ViewChannel],
                          },
                      ]
                    : []),
            ],
            ...(parentId ? { parent: parentId } : {}),
        });
        if (!channel) throw new Error("Couldn't create channel");

        resolve(channel);
    });
};

export const deleteChannel = async ({
    client,
    channelId,
}: {
    client: Client;
    channelId: string;
}) => {
    const guild = await getGuild(client);

    const channel = await guild.channels.fetch(channelId);
    if (!channel) throw new Error("Couldn't find channel");
    await channel.delete();
};
