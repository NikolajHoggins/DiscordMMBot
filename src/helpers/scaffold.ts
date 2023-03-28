import { Client } from 'discord.js';
import { ISystem } from '../models/system.schema.js';
import { getConfig, updateConfig } from '../services/system.service';
import { ChannelsType, ChannelType } from '../types/channel';
import { getGuild } from './guild';
const createChannels = async (client: Client): Promise<ChannelType[]> => {
    const guild = await getGuild(client);

    if (!guild) throw new Error('no guild found');

    let channels: ChannelType[] = [];
    await Promise.all(
        Object.keys(ChannelsType).map(async t => {
            return new Promise(async resolve => {
                const channel = await guild.channels.create({
                    name: t,
                });
                channels.push({ name: t, id: channel.id });
                resolve(null);
            });
        })
    );

    return channels;
};

const createChannel = async (client: Client, name: string): Promise<ChannelType> => {
    const guild = await getGuild(client);
    if (!guild) throw new Error('no guild found');

    const channel = await guild.channels.create({
        name: name,
    });
    return { name: name, id: channel.id };
};

const cacheChannel = async (config: ISystem, name: string, client: Client): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const channel = config.channels.find(t => t.name === name);
        if (!channel) {
            const newChannel = await createChannel(client, name);
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

            const newChannel = await createChannel(client, name);

            // add new channel to the existing channels on config
            newChannels = [...newChannels, newChannel];
            // update config
            await updateConfig({ id: oldConfig._id, body: { channels: newChannels } });
        }
    });
};

const scaffold = async (client: Client) => {
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
};

export default scaffold;
