import { Client, Events, MessageReaction } from 'discord.js';
import { getConfig } from '../services/system.service';
import { ChannelsType } from '../types/channel';

const handlePingRoleReaction = async (reaction: MessageReaction, user: any) => {
    if (!process.env.PING_TO_PLAY_ROLE_ID) return;

    const pingRole = await reaction.message.guild?.roles.fetch(process.env.PING_TO_PLAY_ROLE_ID); //@TODO make roles with scaffolding instead of hardcoding
    const sender = await reaction.message.guild?.members.fetch(user.id);
    if (!pingRole || !sender) return;

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
            handlePingRoleReaction(reaction as MessageReaction, user);
        return;
    });
};
