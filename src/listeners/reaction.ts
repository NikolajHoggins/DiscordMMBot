import { Client, Events, MessageReaction, User } from 'discord.js';
import { updateLeaderboard } from '../helpers/leaderboard';
import { sendMessage } from '../helpers/messages';
import * as matchService from '../services/match.service';
import { addWinLoose } from '../services/player.service';
import { getConfig } from '../services/system.service';
import { ChannelsType } from '../types/channel';

const handleMatchScore = async (reaction: MessageReaction, user: any, client: Client) => {
    if (!reaction.emoji.name) return;
    //channelid
    const channelId = reaction.message.channelId;
    const match = await matchService.findByChannelId(channelId);
    if (!match) return;
    const { teamA, teamB } = match;
    const players = [...teamA, ...teamB];
    if (!players.includes(user.id)) {
        reaction.users.remove(user.id);
    }

    const teams = {
        a: teamA,
        b: teamB,
    };
    if (reaction.count > players.length / 2) {
        const winner = reaction.emoji.name === '🇦' ? 'a' : 'b';
        sendMessage({
            channelId,
            messageContent: `Team ${winner.toUpperCase()} wins`,
            client,
        });
        //Set winner on Match
        matchService.setWinner({ matchNumber: match.match_number, winner: winner });

        //loop through winner team and append 1 win
        for (const i in players) {
            const player = players[i];

            const won = teams[winner].includes(player);

            await addWinLoose({ playerId: player, won: won });
        }

        //delete match
        setTimeout(() => {
            matchService.end({ matchNumber: match.match_number, client });
            //update loaderboard
            updateLeaderboard({ client });
        }, 10000);
    }
};

const handlePingRoleReaction = async (reaction: MessageReaction, user: any, client: Client) => {
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

        if (['🇧', '🇦'].includes(reaction.emoji.name))
            handleMatchScore(reaction as MessageReaction, user, client);

        //get role channel id from config
        const config = await getConfig();
        if (!config) throw new Error("Couldn't get config");
        const roleChannelId = config.channels.find(c => c.name === ChannelsType.roles)?.id;
        if (!roleChannelId) throw new Error("Couldn't get role channel id");

        if (reaction.message.channelId === roleChannelId)
            handlePingRoleReaction(reaction as MessageReaction, user, client);
        return;
    });
};
