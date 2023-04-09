import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    Guild,
    User,
} from 'discord.js';
import { updateStatus } from '../crons/updateQueue';
import { PRETTY_TEAM_NAMES, sendMessage } from '../helpers/messages';
import Match, { IMatch, MatchChannels } from '../models/match.schema';
import Queue, { IQueue } from '../models/queue.schema';
import { removePlayersFromQueue } from './queue.service';
import { getGuild } from '../helpers/guild';
import { createTeams } from '../helpers/players';
import { logMatch } from '../helpers/logs';
import { getChannelId } from './system.service';
import { CategoriesType, ChannelsType } from '../types/channel';
import { updateLeaderboard } from '../helpers/leaderboard';
import { createTeamsEmbed } from '../helpers/embed';
import { calculateEloChanges } from '../helpers/elo.js';
import { deleteChannel, createChannel } from '../helpers/channel.js';
const DEBUG_MODE = true;

const getNewMatchNumber = async (): Promise<number> => {
    return new Promise(async resolve => {
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
    return new Promise(async resolve => {
        const role = await guild.roles.create({ name: `match-${matchNumber}` });

        for (const i in queuePlayers) {
            const p = queuePlayers[i];
            const member = await guild.members.fetch(p.discordId);
            await member.roles.add(role);
        }

        resolve(role.id);
    });
};
const createVCs = ({ client, match }: { client: Client; match: IMatch }) => {
    return new Promise(async resolve => {
        const matchCategoryId = await getChannelId(CategoriesType.matches);
        const teamAVC = await createChannel({
            client,
            name: `Team A VC`,
            parentId: matchCategoryId,
            type: ChannelType.GuildVoice,
            allowedIds: match.teamA,
        });
        const teamBVC = await createChannel({
            client,
            name: `Team B VC`,
            parentId: matchCategoryId,
            type: ChannelType.GuildVoice,
            allowedIds: match.teamB,
        });

        await Match.updateOne(
            { match_number: match.match_number },
            {
                $set: {
                    channels: { ...match.channels, teamAVoice: teamAVC.id, teamBVoice: teamBVC.id },
                },
            }
        );

        resolve(true);
    });
};

const createMatchChannel = ({
    client,
    matchNumber,
    queuePlayers,
}: {
    client: Client;
    matchNumber: number;
    queuePlayers: IQueue[];
}): Promise<{ channelId: string; roleId: string }> => {
    return new Promise(async resolve => {
        const guild = await getGuild(client);
        const newRole = await setPermissions({
            guild,
            matchNumber,
            queuePlayers,
        });
        const matchCategoryId = await getChannelId(CategoriesType.matches);
        const matchChannel = await createChannel({
            client,
            name: `Match-${matchNumber}`,
            parentId: matchCategoryId,
            allowedIds: [newRole],
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
    return new Promise(async resolve => {
        if (!process.env.SERVER_ID) return;

        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);

        const queue = await Queue.find().sort({ signup_time: -1 });
        const count = DEBUG_MODE ? 1 : 10;

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

            const { channelId, roleId } = await createMatchChannel({
                client,
                queuePlayers,
                matchNumber: newNumber,
            });

            const teams = createTeams(queuePlayers);
            const newMatch = new Match({
                match_number: newNumber,
                start: Date.now(),
                channels: {
                    ready: channelId,
                },
                status: 'pending',
                roleId: roleId,
                ...teams,
            });
            await newMatch.save();

            await createVCs({ client, match: newMatch });

            logMatch({ match: newMatch, client });

            //Remove players from queue
            await removePlayersFromQueue(queuePlayers);
            await updateStatus(client);
            await sendReadyMessage({ client, channelId, queuePlayers, match: newMatch });
        }

        resolve();
    });
};
const createSideVotingChannel = async ({
    client,
    match,
}: {
    client: Client;
    match: IMatch;
}): Promise<string> => {
    return new Promise(async resolve => {
        const matchCategoryId = await getChannelId(CategoriesType.matches);
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('colonist')
                    .setLabel('Colonist')
                    .setStyle(ButtonStyle.Primary)
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('reyab')
                    .setLabel('Reyab')
                    .setStyle(ButtonStyle.Primary)
            );

        const teamAChannel = await createChannel({
            client,
            name: `Team A Match-${match.match_number}`,
            parentId: matchCategoryId,
            allowedIds: match.teamA,
        });

        const sideMessage = { content: 'Pick a side', components: [row] };
        await sendMessage({ channelId: teamAChannel.id, messageContent: sideMessage, client });

        resolve(teamAChannel.id);
    });
};
const createMapVotingChannel = async ({
    client,
    match,
}: {
    client: Client;
    match: IMatch;
}): Promise<string> => {
    return new Promise(async resolve => {
        const matchCategoryId = await getChannelId(CategoriesType.matches);

        const teamBChannel = await createChannel({
            client,
            name: `Team B Match-${match.match_number}`,
            parentId: matchCategoryId,
            allowedIds: match.teamB,
        });

        resolve(teamBChannel.id);
    });
};

const createVotingChannels = ({
    client,
    match,
}: {
    client: Client;
    match: IMatch;
}): Promise<void> => {
    return new Promise(async resolve => {
        if (!match) return;

        const teamAChannel = await createSideVotingChannel({ client, match });
        const teamBChannel = await createMapVotingChannel({ client, match });

        const dbMatch = await Match.findOne({ match_number: match.match_number });
        if (!dbMatch) throw new Error('No match found');

        await Match.updateOne(
            { match_number: match.match_number },
            {
                $set: {
                    channels: { ...dbMatch.channels, teamA: teamAChannel, teamB: teamBChannel },
                },
            }
        );

        resolve();
    });
};

export const startGame = (client: Client, match: IMatch): Promise<void> => {
    return new Promise(async resolve => {
        if (!match) return;

        //Delete match ready up channel
        if (match.channels.ready) {
            await deleteChannel({ client, channelId: match.channels.ready });
            //Remove ready channel from database match
            await Match.updateOne(
                { match_number: match.match_number },
                { $unset: { 'channels.ready': '' } }
            );
        }

        await createVotingChannels({ client, match });

        // const dbMatch = await Match.findOne({ match_number: match.match_number });
        // if (!dbMatch) throw new Error('No match found');
        // dbMatch.status = 'started';
        // await dbMatch.save();

        // await sendMessage({
        //     channelId: match.channels.ready,
        //     messageContent: 'All players ready, game is starting',
        //     client,
        // });
        // const teamsEmbed = createTeamsEmbed({ teamA: match.teamA, teamB: match.teamB });

        // await sendMessage({
        //     channelId: match.channels.ready,
        //     messageContent: { embeds: [teamsEmbed] },
        //     client,
        // });

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
                channelId: match.channels.matchChannel,
                messageContent: PRETTY_TEAM_NAMES[winner] + ' wins!',
                client,
            });

            setTimeout(() => {
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

        await Promise.all(
            Object.keys(match.channels).map(
                (key: string) =>
                    new Promise(async resolve => {
                        const channelId = match.channels[key as keyof MatchChannels];
                        if (!channelId) return resolve(true);

                        await deleteChannel({
                            client,
                            channelId,
                        });
                        resolve(true);
                    })
            )
        );
    });
};
