import { Client, EmbedBuilder, Guild, PermissionsBitField, Role, User } from 'discord.js';
import { updateStatus } from '../crons/updateQueue';
import { PRETTY_TEAM_NAMES, sendMessage } from '../helpers/messages';
import Match, { IMatch } from '../models/match.schema';
import Queue, { IQueue } from '../models/queue.schema';
import { removePlayersFromQueue } from './queue.service';
import { getGuild } from '../helpers/guild';
import { createTeams } from '../helpers/players';
import { logMatch } from '../helpers/logs';
import { getChannelId } from './system.service';
import { CategoriesType, ChannelsType } from '../types/channel';
import { updateLeaderboard } from '../helpers/leaderboard';
import { addWinLoss } from './player.service';
import { createTeamsEmbed } from '../helpers/embed';
import { calculateEloChanges } from '../helpers/elo.js';
const DEBUG_MODE = true;

const getNewMatchNumber = async (): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const latest = await Match.find()
            .sort({ match_number: -1 })
            .then(matches => matches[0]);
        resolve(latest ? latest.match_number + 1 : 1);
    });
};

const setPermissions = async ({
    guild,
    matchNumber,
    queuePlayers,
}: {
    guild: Guild;
    matchNumber: number;
    queuePlayers: IQueue[];
}): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const role = await guild.roles.create({ name: `match-${matchNumber}` });

        for (const i in queuePlayers) {
            const p = queuePlayers[i];
            const member = await guild.members.fetch(p.discordId);
            await member.roles.add(role);
        }

        resolve(role.id);
    });
};

const createChannel = ({
    guild,
    everyoneRole,
    matchNumber,
    queuePlayers,
}: {
    guild: Guild;
    everyoneRole: Role;
    matchNumber: number;
    queuePlayers: IQueue[];
}): Promise<{ channelId: string; roleId: string }> => {
    return new Promise(async (resolve, reject) => {
        const newRole = await setPermissions({
            guild,
            matchNumber,
            queuePlayers,
        });
        const matchCategoryId = await getChannelId(CategoriesType.matches);
        const matchChannel = await guild.channels.create({
            name: `Match-${matchNumber}`,
            permissionOverwrites: [
                {
                    id: everyoneRole.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: newRole,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                },
                ...(process.env.MOD_ROLE_ID
                    ? [
                          {
                              id: process.env.MOD_ROLE_ID,
                              allow: [PermissionsBitField.Flags.ViewChannel],
                          },
                      ]
                    : []),
            ],
            parent: matchCategoryId,
        });

        resolve({ channelId: matchChannel.id, roleId: newRole });
    });
};

const sendReadyMessage = async ({
    channelId,
    client,
    queuePlayers,
    match,
}: {
    channelId: string;
    client: Client;
    queuePlayers: IQueue[];
    match: IMatch;
}): Promise<void> => {
    return new Promise(async () => {
        const timeToReadyInMs = 30000;
        const warning = timeToReadyInMs - 10000;
        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);
        const readyMessage = await sendMessage({
            channelId,
            messageContent: `Game has been found, you have ${
                timeToReadyInMs / 1000
            } seconds to ready up. Once clicked, you cannot unready`,
            client,
        });
        if (!readyMessage) return;

        let q = queuePlayers.map(q => q.discordId);
        readyMessage.react('✅');

        setTimeout(() => {
            q.forEach(id => {
                sendMessage({
                    channelId,
                    messageContent: `<@${id}> you have ${
                        (timeToReadyInMs - warning) / 1000
                    } seconds to ready up`,
                    client,
                });
            });
        }, warning);
        const filter = (reaction: any, user: User) => {
            q = q.filter(id => id !== user.id);

            if (q.length <= 0) {
                readyMessage.delete();
                startGame(client, match);
            }
            if (queuePlayers.find(q => q.discordId === user.id)) return true;
            return false;
        };
        readyMessage.awaitReactions({ filter, time: timeToReadyInMs }).then(() => {
            if (q.length <= 0) return;
            sendMessage({
                channelId,
                messageContent: `${q.map(
                    player => `<@${player}>,`
                )} failed to accept the match, ending game`,
                client,
            });

            sendMessage({
                channelId: queueChannelId,
                messageContent: `${q.map(player => `<@${player}>,`)} failed to accept match ${
                    match.match_number
                }`,
                client,
            });
            setTimeout(() => {
                end({ matchNumber: match.match_number, client });
            }, 5000);
        });
    });
};

export const tryStart = (client: Client): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!process.env.SERVER_ID) return;

        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);

        const queue = await Queue.find().sort({ signup_time: -1 });
        const count = DEBUG_MODE ? 2 : 10;

        if (queue.length >= count) {
            const queuePlayers = queue.slice(0, count);

            if (!DEBUG_MODE || true) {
                await sendMessage({
                    channelId: queueChannelId,
                    messageContent: count + ' players in queue - Game is starting',
                    client,
                });
            }

            const guild = await getGuild(client);
            if (!guild) throw new Error("Couldn't find guild");

            const newNumber = await getNewMatchNumber();

            const everyone = await guild.roles.fetch(process.env.SERVER_ID);

            if (!everyone) throw new Error("Couldn't find everyone role");

            const { channelId, roleId } = await createChannel({
                guild,
                everyoneRole: everyone,
                queuePlayers,
                matchNumber: newNumber,
            });

            const teams = createTeams(queuePlayers);
            const newMatch = new Match({
                match_number: newNumber,
                start: Date.now(),
                channelId: channelId,
                status: 'pending',
                roleId: roleId,
                ...teams,
            });
            await newMatch.save();
            logMatch({ match: newMatch, client });

            //Remove players from queue
            await removePlayersFromQueue(queuePlayers);
            await updateStatus(client);
            await sendReadyMessage({ client, channelId, queuePlayers, match: newMatch });
        }

        resolve();
    });
};
export const startGame = (client: Client, match: IMatch): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!match) return;
        const dbMatch = await Match.findOne({ match_number: match.match_number });
        if (!dbMatch) throw new Error('No match found');
        dbMatch.status = 'started';
        await dbMatch.save();

        await sendMessage({
            channelId: match.channelId,
            messageContent: 'All players ready, game is starting',
            client,
        });
        const teamsEmbed = createTeamsEmbed({ teamA: match.teamA, teamB: match.teamB });

        await sendMessage({
            channelId: match.channelId,
            messageContent: { embeds: [teamsEmbed] },
            client,
        });

        resolve();
    });
};

export const findByChannelId = async (channelId: string): Promise<IMatch | null> => {
    return new Promise(async resolve => {
        resolve(await Match.findOne({ channelId: channelId }));
    });
};

export const setScore = async ({
    matchNumber,
    team,
    score,
    client,
}: {
    matchNumber: number;
    team: 'teamA' | 'teamB';
    score: number;
    client: Client;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error("Couldn't find match");
        const index = team === 'teamA' ? 'teamARounds' : 'teamBRounds';
        match[index] = score;
        match.save();

        //if both scores are set, end match
        if (match.teamARounds && match.teamBRounds) {
            if (match.teamARounds !== 11 && match.teamBRounds !== 11) return;

            const winner = match.teamARounds > match.teamBRounds ? 'teamA' : 'teamB';

            sendMessage({
                channelId: match.channelId,
                messageContent: PRETTY_TEAM_NAMES[winner] + ' wins!',
                client,
            });

            setTimeout(() => {
                console.log('here');
                updateLeaderboard({ client });
                calculateEloChanges(match);

                end({ matchNumber, client: client });
            }, 3000);
        }
    });
};

export const end = async ({ matchNumber, client }: { matchNumber: number; client: Client }) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) return;
        match.status = 'ended';
        await match.save();
        const guild = await getGuild(client);
        await guild?.roles.delete(match.roleId);

        await guild?.channels.delete(match.channelId);
    });
};
