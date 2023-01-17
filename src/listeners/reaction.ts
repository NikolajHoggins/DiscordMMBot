import { Client, Events, MessageReaction } from 'discord.js';
import { findByChannelId } from '../services/match.service';

const handleMatchScore = async (reaction: MessageReaction, user: any) => {
    //channelid
    const channelId = reaction.message.channelId;
    const match = await findByChannelId(channelId);
    if (!match) return;

    const players = match.playerIds;
    if (!players.includes(user.id)) reaction.users.remove(user.id);
};

export default (client: Client): void => {
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (!client.user || !client.application || user.bot) {
            return;
        }
        if (!reaction.emoji.name) return;

        if (['🇧', '🇦'].includes(reaction.emoji.name))
            handleMatchScore(reaction as MessageReaction, user);
        return;
    });
};
