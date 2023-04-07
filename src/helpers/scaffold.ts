import { Client, TextChannel, ChannelType as DiscordChannelType } from 'discord.js';
import { ISystem } from '../models/system.schema.js';
import { getConfig, updateConfig } from '../services/system.service';
import { CategoriesType, ChannelsType, ChannelType } from '../types/channel';
import { getEveryoneRole, getGuild } from './guild';
import { sendMessage } from './messages';

const createChannel = async (
    client: Client,
    name: string,
    category?: boolean
): Promise<ChannelType> => {
    const guild = await getGuild(client);
    if (!guild) throw new Error('no guild found');

    const channel = await guild.channels.create({
        name: name,
        type: category ? DiscordChannelType.GuildCategory : DiscordChannelType.GuildText,
    });
    return { name: name, id: channel.id };
};

const cacheChannel = async (
    config: ISystem,
    name: string,
    client: Client,
    isCategory?: boolean
): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const channel = config.channels.find(t => t.name === name);
        if (!channel) {
            const newChannel = await createChannel(client, name, isCategory);
            const oldConfig = await getConfig();
            const newChannels = [...oldConfig.channels, newChannel];
            await updateConfig({ id: oldConfig._id, body: { channels: newChannels } });
            resolve(true);
            return;
        }

        const guild = await getGuild(client);
        if (!guild) throw new Error("Couldn't fetch guild");

        try {
            const guildChannel = await guild.channels.fetch(channel.id);
            if (!guildChannel) throw new Error("Couldn't fetch guild channel, " + channel.name);
        } catch (error) {
            const oldConfig = await getConfig();

            let newChannels = oldConfig.channels.filter(t => t.name !== channel.name);

            const newChannel = await createChannel(client, name, isCategory);

            // add new channel to the existing channels on config
            newChannels = [...newChannels, newChannel];
            // update config
            await updateConfig({ id: oldConfig._id, body: { channels: newChannels } });
        }
        resolve(true);
    });
};
const addPingToPlayMessage = async ({ config, client }: { config: ISystem; client: Client }) => {
    const roleChannel = config.channels.find(t => t.name === ChannelsType.roles);
    if (!roleChannel) throw new Error('no role channel found');

    const pingToPlayMessage = await sendMessage({
        channelId: roleChannel.id,
        messageContent: 'React to get ping to play role',
        client,
    });
    if (!pingToPlayMessage) throw new Error("Couldn't send ping to play message");

    pingToPlayMessage.react('✅');
    pingToPlayMessage.react('❌');
};

const cacheReactionRoleMessages = async ({
    config,
    guild,
    client,
}: {
    config: ISystem;
    guild: any;
    client: Client;
}) => {
    //Find and fetch all reaction role messages
    const roleChannel = config.channels.find(t => t.name === ChannelsType.roles);

    if (!roleChannel) throw new Error('no role channel found');

    const channel = (await guild.channels.fetch(roleChannel.id)) as TextChannel;
    if (!channel) throw new Error('role channel not found');

    const messages = await channel.messages.fetch();

    const pingToPlayMessage = messages.filter(m => m.content.includes('ping to play'));
    if (pingToPlayMessage.size === 0) {
        await addPingToPlayMessage({ config, client });
    }
};

const scaffold = async (client: Client) => {
    const guild = await getGuild(client);
    if (!guild) throw new Error('no guild found');
    await getEveryoneRole(client);

    const config = await getConfig();

    //Loop through channelTypes and fetch channels
    await Promise.all(
        Object.keys(ChannelsType).map(key => {
            return new Promise(async (resolve, reject) => {
                await cacheChannel(config, key, client);
                resolve(null);
            });
        })
    );

    await Promise.all(
        Object.keys(CategoriesType).map(key => {
            return new Promise(async (resolve, reject) => {
                await cacheChannel(config, key, client, true);
                resolve(null);
            });
        })
    );

    await cacheReactionRoleMessages({ config, guild, client });
};

export default scaffold;
