import { Client, Events, MessageReaction } from 'discord.js';
import { getConfig } from '../services/system.service';
import { ChannelsType, RanksType } from '../types/channel';
import { ISystem } from '../models/system.schema.js';

const handlePingRoleReaction = async (reaction: MessageReaction, user: any, config: ISystem) => {
    if (!process.env.PING_TO_PLAY_ROLE_ID) return;

    const sender = await reaction.message.guild?.members.fetch(user.id);
    if (!sender) throw new Error("Couldn't get sender");

    const pingRoleId = config.roles.find(({ name }) => name === RanksType.ping)?.id;
    if (!pingRoleId) throw new Error("Couldn't get ping role id");
    const pingRole = await reaction.message.guild?.roles.fetch(pingRoleId); //@TODO make roles with scaffolding instead of hardcoding
    if (!pingRole) throw new Error("Couldn't get ping role");

    if (reaction.emoji.name === '✅') {
        sender.roles.add(pingRole);
        sender.send('Added ping to play role');
    }
    if (reaction.emoji.name === '❌') {
        sender.roles.remove(pingRole);
        sender.send('Removed ping to play role');
    }

    reaction.users.remove(user.id);
};

export default (client: Client): void => {
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (!client.user || !client.application || user.bot) {
            return;
        }
        if (!reaction.emoji.name) return;

        //get role channel id from config
        const config = await getConfig();
        if (!config) throw new Error("Couldn't get config");
        const roleChannelId = config.channels.find(c => c.name === ChannelsType.roles)?.id;
        if (!roleChannelId) throw new Error("Couldn't get role channel id");

        if (reaction.message.channelId === roleChannelId)
            handlePingRoleReaction(reaction as MessageReaction, user, config);
        return;
    });
};
