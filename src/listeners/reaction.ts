import { Client, Events, MessageReaction } from 'discord.js';
import { sendMessage } from '../helpers/messages';
import { findByChannelId } from '../services/match.service';

const handleMatchScore = async (reaction: MessageReaction, user: any, client: Client) => {
    if (!reaction.emoji.name) return;
    //channelid
    const channelId = reaction.message.channelId;
    const match = await findByChannelId(channelId);
    if (!match) return;
    const { teamA, teamB } = match;
    const players = [...teamA, ...teamB];
    if (!players.includes(user.id)) {
        reaction.users.remove(user.id);
    }

    const teamNames = (emoji: string) => {
        if (emoji === '🇦') return 'Team A';
        if (emoji === '🇧') return 'Team B';
    };

    if (reaction.count > players.length / 2) {
        sendMessage({
            channelId,
            messageContent: `${teamNames(reaction.emoji.name)} wins`,
            client,
        });
    }
};

export default (client: Client): void => {
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (!client.user || !client.application || user.bot) {
            return;
        }
        if (!reaction.emoji.name) return;

        if (['🇧', '🇦'].includes(reaction.emoji.name))
            handleMatchScore(reaction as MessageReaction, user, client);
        return;
    });
};
