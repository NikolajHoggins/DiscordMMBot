import { Channel, ChannelType, Client, PermissionsBitField } from 'discord.js';
import { getEveryoneRole, getGuild } from './guild';
import { getConfig } from '../services/system.service';
import { RanksType } from '../types/channel';

export const createChannel = ({
    client,
    name,
    parentId,
    allowedIds,
    type = ChannelType.GuildText,
    rateLimitPerUser,
}: {
    client: Client;
    name: string;
    allowedIds: string[];
    parentId?: string;
    type?: ChannelType.GuildText | ChannelType.GuildVoice;
    rateLimitPerUser?: number;
}): Promise<Channel> => {
    return new Promise(async resolve => {
        const guild = await getGuild(client);

        const everyoneRole = await getEveryoneRole(client);

        const config = await getConfig();
        const modRoleId = config.roles.find(({ name }) => name === RanksType.mod)?.id;
        const channel = await guild.channels.create({
            name: name,
            type: type,

            permissionOverwrites: [
                {
                    id: everyoneRole.id,
                    deny:
                        type === ChannelType.GuildVoice
                            ? [PermissionsBitField.Flags.Connect]
                            : [PermissionsBitField.Flags.ViewChannel],
                },
                ...allowedIds.map(id => ({
                    id: id,
                    allow:
                        type === ChannelType.GuildVoice
                            ? [PermissionsBitField.Flags.Connect]
                            : [PermissionsBitField.Flags.ViewChannel],
                })),
                ...(modRoleId
                    ? [
                          {
                              id: modRoleId,
                              allow:
                                  type === ChannelType.GuildVoice
                                      ? [PermissionsBitField.Flags.Connect]
                                      : [PermissionsBitField.Flags.ViewChannel],
                          },
                      ]
                    : []),
            ],
            ...(parentId ? { parent: parentId } : {}),
            ...(rateLimitPerUser ? { rateLimitPerUser: rateLimitPerUser } : {}),
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
