import {
    Client,
    TextChannel,
    ChannelType as DiscordChannelType,
    ActionRowBuilder,
    MessageActionRowComponentBuilder,
    ButtonStyle,
    ButtonBuilder,
} from 'discord.js';
import { ISystem } from '../models/system.schema';
import { getConfig, getRegionQueue, updateConfig } from '../services/system.service';
import { CategoriesType, ChannelsType, ChannelType, RanksType, VCType } from '../types/channel';
import { getEveryoneRole, getGuild } from './guild';
import { sendMessageInChannel } from './messages';
import { createRole } from './role';
import { GameType, RegionsType, gameTypeName, gameTypeReadyChannels } from '../types/queue';

const createChannel = async (
    client: Client,
    name: string,
    channelType:
        | DiscordChannelType.GuildCategory
        | DiscordChannelType.GuildText
        | DiscordChannelType.GuildVoice,
    parentId?: string
): Promise<ChannelType> => {
    const guild = await getGuild(client);
    if (!guild) throw new Error('no guild found');

    const channel = await guild.channels.create({
        name: name,
        type: channelType,
        ...(parentId ? { parent: parentId } : {}),
    });
    return { name: name, id: channel.id };
};

const cacheChannel = async (
    config: ISystem,
    name: string,
    client: Client,
    channelType:
        | DiscordChannelType.GuildCategory
        | DiscordChannelType.GuildText
        | DiscordChannelType.GuildVoice,
    parentId?: string
): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const channel = config.channels.find(t => t.name === name);
        if (!channel) {
            const newChannel = await createChannel(client, name, channelType, parentId);
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

            const newChannel = await createChannel(client, name, channelType, parentId);

            // add new channel to the existing channels on config
            newChannels = [...newChannels, newChannel];
            // update config
            await updateConfig({ id: oldConfig._id, body: { channels: newChannels } });
        }
        resolve(true);
    });
};

const validateRole = ({
    key,
    config,
    client,
}: {
    key: string;
    config: ISystem;
    client: Client;
}) => {
    return new Promise(async (resolve, reject) => {
        // If this is the mod role and we have a hardcoded ID in env, use it directly
        if (key === RanksType.mod && process.env.MOD_ROLE_ID) {
            const modRoleId = process.env.MOD_ROLE_ID;
            const oldConfig = await getConfig();
            const existing = oldConfig.roles.find(r => r.name === RanksType.mod);
            if (!existing || existing.id !== modRoleId) {
                const newRoles = [
                    ...oldConfig.roles.filter(r => r.name !== RanksType.mod),
                    { name: RanksType.mod, id: modRoleId },
                ];
                await updateConfig({ id: oldConfig._id, body: { roles: newRoles } });
            }
            resolve(true);
            return;
        }

        const role = config.roles.find(r => r.name === key);

        if (!role) {
            const newRole = await createRole({ roleName: key, client });
            const oldConfig = await getConfig();
            const newRoles = [...oldConfig.roles, { name: key, id: newRole.id }];
            await updateConfig({ id: oldConfig._id, body: { roles: newRoles } });
            resolve(true);
            return;
        }

        const guild = await getGuild(client);
        if (!guild) throw new Error("Couldn't fetch guild");
        const guildRole = await guild.roles.fetch(role.id);
        if (!guildRole) {
            const newRole = await createRole({ roleName: key, client });
            const oldConfig = await getConfig();
            const newRoles = [
                ...oldConfig.roles.filter(r => r.name !== key),
                { name: key, id: newRole.id },
            ];
            await updateConfig({ id: oldConfig._id, body: { roles: newRoles } });
            resolve(true);
            return;
        }

        resolve(true);
    });
};

const addPingToPlayMessage = async ({ config, client }: { config: ISystem; client: Client }) => {
    const roleChannel = config.channels.find(t => t.name === ChannelsType.roles);
    if (!roleChannel) throw new Error('no role channel found');

    const pingToPlayMessage = await sendMessageInChannel({
        channelId: roleChannel.id,
        messageContent: 'React to get ping to play role',
        client,
    });
    if (!pingToPlayMessage) throw new Error("Couldn't send ping to play message");

    pingToPlayMessage.react('✅');
    pingToPlayMessage.react('❌');
};

const addRegionMessage = async ({ config, client }: { config: ISystem; client: Client }) => {
    const regionChannel = config.channels.find(t => t.name === ChannelsType.region);
    if (!regionChannel) throw new Error('no region channel found');

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    row.addComponents(
        new ButtonBuilder().setCustomId('region.naw').setLabel('NAW').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('region.nae').setLabel('NAE').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('region.eu').setLabel('EU').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('region.oce').setLabel('OCE').setStyle(ButtonStyle.Success)
    );
    const regionMessage = await sendMessageInChannel({
        channelId: regionChannel.id,
        messageContent: { content: 'Select your region', components: [row] },
        client,
    });
    if (!regionMessage) throw new Error("Couldn't send ping to play message");
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

    let channel: TextChannel;
    try {
        channel = (await guild.channels.fetch(roleChannel.id)) as TextChannel;
    } catch {
        throw new Error('role channel not found or inaccessible');
    }
    if (!channel) throw new Error('role channel not found');

    const messages = await channel.messages.fetch();

    const pingToPlayMessage = messages.filter(m => m.content.includes('ping to play'));
    if (pingToPlayMessage.size === 0) {
        await addPingToPlayMessage({ config, client });
    }
};

const addReadyUpMessage = async ({
    client,
    region,
    text,
    channelId,
    gameType,
}: {
    client: Client;
    region: RegionsType;
    text: string;
    channelId: string;
    gameType: GameType;
}) => {
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`ready.60.${region}.${gameType}`)
            .setLabel(`60 ${region.toUpperCase()}`)
            .setStyle(ButtonStyle.Success)
    );
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`ready.30.${region}.${gameType}`)
            .setLabel(`30 ${region.toUpperCase()}`)
            .setStyle(ButtonStyle.Success)
    );
    if (region === RegionsType.fill) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`ready.unready`)
                .setLabel('unready')
                .setStyle(ButtonStyle.Danger)
        );
    }

    const readyContent = {
        content: text,
        components: [row],
    };
    const readyUpMessage = await sendMessageInChannel({
        channelId: channelId,
        messageContent: readyContent,
        client,
    });
    if (!readyUpMessage) throw new Error("Couldn't send ping to play message");
};
const addSeeQueueMessage = async ({
    client,
    text,
    channelId,
    gameType,
}: {
    client: Client;
    text: string;
    channelId: string;
    gameType: GameType;
}) => {
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`seeQueue.${gameType}`)
            .setLabel(`See Queue`)
            .setStyle(ButtonStyle.Primary)
    );

    const readyContent = {
        content: text,
        components: [row],
    };
    const readyUpMessage = await sendMessageInChannel({
        channelId: channelId,
        messageContent: readyContent,
        client,
    });
    if (!readyUpMessage) throw new Error("Couldn't send ping to play message");
};

const cacheRegionMessages = async ({ config, client }: { config: ISystem; client: Client }) => {
    //Find and fetch ready up messages
    const regionChannel = config.channels.find(t => t.name === ChannelsType.region);
    if (!regionChannel) throw new Error('no region channel found');

    let channel: TextChannel;
    try {
        channel = (await client.channels.fetch(regionChannel.id)) as TextChannel;
    } catch {
        throw new Error('region channel not found or inaccessible');
    }
    if (!channel) throw new Error('region channel not found');

    const messages = await channel.messages.fetch();

    const regionMessages = messages.filter(m => m.content.includes('Select your region'));
    if (regionMessages.size === 0) {
        await addRegionMessage({ config, client });
    }
};
const cacheReadyUpMessages = async ({
    config,
    client,
    gameType,
}: {
    config: ISystem;
    client: Client;
    gameType: GameType;
}) => {
    const channelsType = gameTypeReadyChannels[gameType];

    //Find and fetch ready up messages
    const readyChannel = config.channels.find(t => t.name === channelsType);
    if (!readyChannel) throw new Error('no ready channel found');

    let channel: TextChannel;
    try {
        channel = (await client.channels.fetch(readyChannel.id)) as TextChannel;
    } catch {
        throw new Error('ready-up channel not found or inaccessible');
    }
    if (!channel) throw new Error('ready channel not found');

    const regionQueueEnabled = await getRegionQueue();

    const messages = await channel.messages.fetch();

    const readyUpMessages = messages.filter(m =>
        m.content.includes(
            `Click a button to ready up for ${gameTypeName[gameType]} for set minutes`
        )
    );
    if (readyUpMessages.size === 0) {
        await addReadyUpMessage({
            client,
            region: RegionsType.fill as RegionsType,
            text: `Click a button to ready up for ${gameTypeName[gameType]} for set minutes${
                regionQueueEnabled
                    ? '\n*Region you queue decides server, not where you are from*\n\nPlease use fill if you do not have a strong preference'
                    : ''
            }`,
            channelId: readyChannel.id,
            gameType,
        });
        if (regionQueueEnabled) {
            await addReadyUpMessage({
                client,
                region: RegionsType.eu as RegionsType,
                text: '🇪🇺',
                channelId: readyChannel.id,
                gameType,
            });
            await addReadyUpMessage({
                client,
                region: RegionsType.na as RegionsType,
                text: '🇺🇸',
                channelId: readyChannel.id,
                gameType,
            });
        }
        await addSeeQueueMessage({
            client,
            text: 'Click to see the queue',
            channelId: readyChannel.id,
            gameType,
        });
    }
};

const scaffold = async (client: Client) => {
    const guild = await getGuild(client);
    if (!guild) throw new Error('no guild found');
    await getEveryoneRole(client);

    const config = await getConfig();

    // Create the top-level bot category first so everything else can nest under it
    await cacheChannel(config, CategoriesType.bot, client, DiscordChannelType.GuildCategory);
    const freshConfig = await getConfig();
    const botCategoryId = freshConfig.channels.find(t => t.name === CategoriesType.bot)?.id;

    //Loop through channelTypes and fetch channels — all placed under the bot category
    await Promise.all(
        Object.keys(ChannelsType).map(key => {
            return new Promise(async (resolve, reject) => {
                await cacheChannel(
                    freshConfig,
                    key,
                    client,
                    DiscordChannelType.GuildText,
                    botCategoryId
                );
                resolve(null);
            });
        })
    );

    //Loop through ranktypes and make sure rank exists
    await Promise.all(
        Object.keys(RanksType).map(key => {
            return new Promise(async (resolve, reject) => {
                // await createRank(config, key, client);
                await validateRole({ key, config, client });
                resolve(null);
            });
        })
    );

    // Game categories (matches) are top-level — match channels nest under them during gameplay
    await Promise.all(
        Object.keys(CategoriesType)
            .filter(key => key !== CategoriesType.bot)
            .map(key => {
                return new Promise(async (resolve, reject) => {
                    await cacheChannel(freshConfig, key, client, DiscordChannelType.GuildCategory);
                    resolve(null);
                });
            })
    );

    await Promise.all(
        Object.keys(VCType).map(key => {
            return new Promise(async (resolve, reject) => {
                await cacheChannel(
                    freshConfig,
                    key,
                    client,
                    DiscordChannelType.GuildVoice,
                    botCategoryId
                );
                resolve(null);
            });
        })
    );

    await cacheReactionRoleMessages({ config: await getConfig(), guild, client });
    await cacheReadyUpMessages({ config: await getConfig(), client, gameType: GameType.squads });
    await cacheRegionMessages({ config: await getConfig(), client });
};

export default scaffold;
