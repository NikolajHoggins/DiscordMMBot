import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    EmbedBuilder,
    Guild,
    MessageActionRowComponentBuilder,
    TextChannel,
} from 'discord.js';
import { updateStatus } from '../crons/updateQueue';
import {
    botLog,
    createReadyMessage,
    sendMatchFoundMessage,
    sendMessage,
} from '../helpers/messages';
import Match, { IMatch, IMatchChannels, MatchStatus } from '../models/match.schema';
import Queue, { IQueue } from '../models/queue.schema';
import { removePlayersFromQueue } from './queue.service';
import { getGuild } from '../helpers/guild';
import { createTeams, getTeam } from '../helpers/players';
import { logMatch } from '../helpers/logs';
import {
    getChannelId,
    getGameMaps,
    getGameTeams,
    getRegionQueue,
    getWinScore,
} from './system.service';
import { CategoriesType, ChannelsType } from '../types/channel';
import { updateLeaderboard } from '../helpers/leaderboard';
import { createMatchEmbed, createMatchResultEmbed, createScoreCardEmbed } from '../helpers/embed';
import { calculateEloChanges } from '../helpers/elo';
import { deleteChannel, createChannel } from '../helpers/channel';
import { getVotes } from '../helpers/match';
import { capitalize, groupBy, map, shuffle, upperCase } from 'lodash';
import { getTeamBName } from '../helpers/team';
import { addBan, addWinLoss } from './player.service';
import Player, { MatchResultType } from '../models/player.schema';
import { BansType } from '../types/bans';
import {
    GameType,
    gameTypePlayerCount,
    gameTypeQueueChannels,
    gameTypeResultsChannels,
} from '../types/queue';
const DEBUG_MODE = false;

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const VOTE_SECONDS = 45;
const getNewMatchNumber = async (): Promise<number> => {
    return new Promise(async resolve => {
        const latest = await Match.find({}, { _id: 0, match_number: 1 })
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
//Disabled as ingame comms is better for quest players
const createVCs = ({ client, match }: { client: Client; match: IMatch }) => {
    return new Promise(async resolve => {
        const matchCategoryId = await getChannelId(CategoriesType.matches);
        const teamVC = await createChannel({
            client,
            name: `Match-${match.match_number} Voice`,
            parentId: matchCategoryId,
            type: ChannelType.GuildVoice,
            allowedIds: match.players.map(p => p.id),
        });

        await Match.updateOne(
            { match_number: match.match_number },
            {
                $set: {
                    channels: { ...match.channels, voice: teamVC.id },
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
    return new Promise(async resolve => {
        const timeToReadyInMs = 3 * MINUTE_IN_MS;

        const readyMessage = await sendMessage({
            channelId,
            messageContent: `Game has been found, you have ${
                timeToReadyInMs / 1000
            } seconds to ready up.`,
            client,
        });

        if (!readyMessage) throw new Error('Could not send ready message');

        const readyMessageContent = await createReadyMessage({
            matchNumber: match.match_number,
        });

        await sendMessage({
            channelId: match.channels.ready,
            client,
            messageContent:
                'Missing players: ' +
                shuffle(match.players.filter(p => !p.ready).map(p => `<@${p.id}>`)).join(' '),
        });
        const confirmMessage = await sendMessage({
            channelId: match.channels.ready,
            client,
            messageContent: readyMessageContent,
        });
        if (!confirmMessage) throw new Error('Could not send ready message');

        resolve();
    });
};

export const checkPlayersReady = ({
    matchNumber,
    client,
}: {
    matchNumber: number;
    client: Client;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match || match.status !== 'pending') return resolve(false);

        const unreadyPlayers = match.players.filter(p => p.ready !== true);
        if (unreadyPlayers.length <= 0) {
            await Match.updateOne(
                { match_number: matchNumber },
                { $set: { status: MatchStatus.voting } }
            );
            startVotingPhase(client, match);

            return resolve(true);
        }

        //if it's been more than 3 minutes since the match started, end game
        if (Date.now() - match.start > 3 * 60 * SECOND_IN_MS) {
            sendMessage({
                channelId: match.channels.ready,
                messageContent: `${unreadyPlayers.map(
                    player => `<@${player.id}>,`
                )} failed to accept the match, ending game`,
                client,
            });

            //get queue channel id
            const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);
            sendMessage({
                channelId: queueChannelId,
                messageContent: `${unreadyPlayers.map(
                    player => `<@${player.id}>,`
                )} failed to accept match ${match.match_number}`,
                client,
            });

            //ban players not ready
            Promise.all(
                unreadyPlayers.map(player => {
                    return new Promise(async resolve => {
                        addBan({
                            client,
                            reason: `Failed to accept match ${match.match_number}`,
                            type: BansType.ready,
                            userId: player.id,
                            display: true,
                        });
                        resolve(true);
                    });
                })
            );

            setTimeout(async () => {
                end({ matchNumber: match.match_number, client, requeuePlayers: true });
            }, 5000);
            return resolve(true);
        }

        // if match. start is more 2 minutes ago, send message
        if (Date.now() - match.start > 2 * MINUTE_IN_MS - 20 * SECOND_IN_MS) {
            const timeToReadyInMs = 3 * MINUTE_IN_MS;
            const endTime = match.start + timeToReadyInMs;
            const timeLeft = endTime - Date.now();
            const channelId = match.channels.ready;
            const q = match.players.filter(p => p.ready !== true).map(p => p.id);
            sendMessage({
                channelId,
                messageContent: `${q.map(player => `<@${player}>,`)} you have ${Math.floor(
                    timeLeft / SECOND_IN_MS
                )} seconds to ready up`,
                client,
            });
        }
    });
};

export const checkScoreVerified = ({
    client,
    matchNumber,
}: {
    client: Client;
    matchNumber: number;
}) => {
    return new Promise(async resolve => {
        console.log('validating', matchNumber);
        botLog({
            messageContent: `Checking if scores are verified for match ${matchNumber}`,
            client,
        });
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');
        const verifiedPlayersCount = match.players.filter(p => p.verifiedScore === true).length;
        const totalNeeded = match.players.length / 2 + 1;

        if (verifiedPlayersCount >= totalNeeded) {
            sendMessage({
                channelId: match.channels.matchChannel,
                messageContent: 'All players have verified score',
                client: client,
            });
            checkMatchMVP({ matchNumber, client });
            finishMatch({
                matchNumber: match.match_number,
                client: client,
            });
        }
    });
};

export const tryStart = (client: Client, gameType: GameType): Promise<void> => {
    return new Promise(async resolve => {
        if (!process.env.SERVER_ID) throw new Error('No server id');

        const regionQueueEnabled = gameType === GameType.squads ? await getRegionQueue() : false;

        const queueChannelId = await getChannelId(gameTypeQueueChannels[gameType]);

        console.log('trying to start', gameType);
        if (gameType === GameType.duels) {
            tryStartDuels(client);
            return;
        }

        const queue = await Queue.find({ gameType }).sort({ signup_time: 1 });
        const count = gameTypePlayerCount[gameType];
        if (!regionQueueEnabled && queue.length >= count) {
            return await startMatch({
                client,
                queue: queue,
                count,
                queueChannelId,
                gameType,
            });
        }

        const naPlayers = queue.filter(q => q.queueRegion === 'na');
        const euPlayers = queue.filter(q => q.queueRegion === 'eu');
        const fillPlayers = queue.filter(q => q.queueRegion === 'fill');

        if (naPlayers.length >= count) {
            //start na match
            return await startMatch({
                client,
                queue: [...naPlayers, ...fillPlayers],
                count,
                queueChannelId,
                region: 'na',
                gameType,
            });
        }
        if (euPlayers.length >= count) {
            return await startMatch({
                client,
                queue: [...euPlayers, ...fillPlayers],
                count,
                queueChannelId,
                region: 'eu',
                gameType,
            });
            //start eu match
        }

        if (euPlayers.length + fillPlayers.length >= count) {
            return await startMatch({
                client,
                queue: [...euPlayers, ...fillPlayers],
                count,
                queueChannelId,
                region: 'eu',
                gameType,
            });
        }
        if (naPlayers.length + fillPlayers.length >= count) {
            return await startMatch({
                client,
                queue: [...naPlayers, ...fillPlayers],
                count,
                queueChannelId,
                region: 'na',
                gameType,
            });
        }

        if (queue.length >= count) {
            await sendMessage({
                channelId: queueChannelId,
                messageContent: `${queue.length} players in queue, couldn't create a game with servers of players wishes`,
                client,
            });
        }

        resolve();
    });
};

const tryStartDuels = (client: Client): Promise<void> => {
    return new Promise(async resolve => {
        if (!process.env.SERVER_ID) throw new Error('No server id');
        const eloDiffCutOff = 300;
        const queueChannelId = await getChannelId(ChannelsType['duels-queue']);
        const minutesForPriority = 5;
        const count = gameTypePlayerCount[GameType.duels];

        const queue = await Queue.find({ gameType: GameType.duels }).sort({ signup_time: 1 });
        console.log('queue', queue);
        //Players who has been in queue for more than 10 minutes
        const priorityQueue = queue.filter(
            q => Date.now() - q.signup_time > minutesForPriority * MINUTE_IN_MS
        );

        const inMatch: IQueue[] = [];

        priorityQueue.forEach(async q => {
            //Find closest rated player in queue
            let closestPlayer: IQueue | null = null;
            console.log('running priority for player', q.name);
            queue.forEach(q2 => {
                if (q2.id === q.id) return;
                if (closestPlayer === null) {
                    closestPlayer = q2;
                    return;
                }
                const diff = Math.abs(q2.rating - q.rating);
                const closestDiff = Math.abs(closestPlayer.rating - q.rating);
                if (diff < closestDiff) closestPlayer = q2;
            });
            if (!closestPlayer) return;
            inMatch.push(q);
            inMatch.push(closestPlayer);
            await startMatch({
                client,
                queue: [q, closestPlayer],
                count,
                queueChannelId,
                gameType: GameType.duels,
            });
        });

        queue.forEach(async q => {
            if (inMatch.includes(q.id)) return;

            const closestPlayer = queue.find(q2 => {
                if (q2.id === q.id) return false;
                if (inMatch.includes(q2.id)) return false;
                const diff = Math.abs(q2.rating - q.rating);
                return diff < eloDiffCutOff;
            });
            if (!closestPlayer) return;
            inMatch.push(q.id);
            inMatch.push(closestPlayer.id);
            await startMatch({
                client,
                queue: [q, closestPlayer],
                count,
                queueChannelId,
                gameType: GameType.duels,
            });
        });

        const remainingPlayers = queue.filter(q => !inMatch.includes(q.id));
        if (remainingPlayers.length >= count) {
            await sendMessage({
                channelId: queueChannelId,
                messageContent: `Players in queues rating are too far apart`,
                client,
            });
            remainingPlayers.forEach(async q => {
                //Send message saying how long till priority queue
                const timeLeft = minutesForPriority * MINUTE_IN_MS - (Date.now() - q.signup_time);
                const timeLeftInMinutes = Math.floor(timeLeft / MINUTE_IN_MS);
                const timeLeftInSeconds = Math.floor(
                    (timeLeft - timeLeftInMinutes * MINUTE_IN_MS) / SECOND_IN_MS
                );
                const timeLeftString = `${timeLeftInMinutes} minutes and ${timeLeftInSeconds} seconds`;
                await sendMessage({
                    channelId: queueChannelId,
                    messageContent: `${q.name} you have ${timeLeftString} left until you get priority queue. This will ignore rating difference and ensure you a match`,
                    client,
                });
            });
        }
    });
};

const startMatch = ({
    queue,
    count,
    queueChannelId,
    client,
    region,
    gameType,
}: {
    queue: IQueue[];
    count: number;
    queueChannelId: string;
    client: Client;
    region?: string;
    gameType: GameType;
}) => {
    return new Promise(async resolve => {
        const sortedPlayers = queue.sort((a, b) => {
            return a.signup_time - b.signup_time;
        });
        const queuePlayers = sortedPlayers.slice(0, count);

        // const firstQueuePlayerRating = sortedPlayers[0].rating;
        // const ratingSortedPlayers = queue.sort((a, b) => b.rating - a.rating);
        // const queuePlayersSortedRating = queuePlayers.sort((a, b) => b.rating - a.rating);
        // const ratingDiff =
        // queuePlayersSortedRating.length > 2
        //     ? queuePlayersSortedRating[-1].rating - queuePlayersSortedRating[0].rating
        //     : 0;

        // console.log('====================================================');
        // console.log('starting match with rating diff', ratingDiff);
        // console.log('highest rating:', ratingSortedPlayers[0].rating);
        // console.log('lowest rating:', ratingSortedPlayers[-1].rating);
        // console.log('first player in queue rating', firstQueuePlayerRating);
        // const closestPossible = getClosestNumbers(
        //     queue.map(q => q.rating),
        //     firstQueuePlayerRating
        // );
        // const closestPossibleSorted = closestPossible.sort((a, b) => b - a);
        // const closestRatingDiff =
        //     closestPossibleSorted.length > 2
        //         ? closestPossibleSorted[-1] - closestPossibleSorted[0]
        //         : 0;
        // console.log('closest team', closestPossible);
        // console.log('rating diff', closestRatingDiff);
        // console.log('====================================================');
        await sendMessage({
            channelId: queueChannelId,
            messageContent:
                count +
                ` players in queue - Game is starting ${
                    region ? `on region ${region.toUpperCase()}` : ''
                }`,
            client,
        });

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
            players: teams,
            region: region,
            version: 0,
            gameType,
        });
        await newMatch.save();

        logMatch({ match: newMatch, client });

        //Remove players from queue
        await removePlayersFromQueue(queuePlayers);
        updateStatus(client);
        sendMatchFoundMessage({ client, match: newMatch });
        await sendReadyMessage({ client, channelId, queuePlayers, match: newMatch });

        resolve(true);
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
        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
        const gameTeams = await getGameTeams();

        gameTeams.forEach(team => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(team)
                    .setLabel(capitalize(team))
                    .setStyle(ButtonStyle.Primary)
            );
        });

        const teamAChannel = await createChannel({
            client,
            name: `Match-${match.match_number} Team A`,
            parentId: matchCategoryId,
            allowedIds: getTeam(match.players, 'a').map(p => p.id),
        });

        const teammatesMessage = `Your teammates are: ${getTeam(match.players, 'a')
            .map(p => `<@${p.id}>`)
            .join(', ')}`;
        await sendMessage({ channelId: teamAChannel.id, messageContent: teammatesMessage, client });
        if (match.gameType === GameType.squads) {
            const sideMessage = {
                content: `Pick a side to start on. Voting ends in ${VOTE_SECONDS} seconds`,
                components: [row],
            };
            await sendMessage({ channelId: teamAChannel.id, messageContent: sideMessage, client });
            return resolve(teamAChannel.id);
        }

        await sendMessage({
            channelId: teamAChannel.id,
            messageContent: `Since this is 1v1, you will be choosing server host instead of starting side. Your enemy is voting for map. Vote ends in ${VOTE_SECONDS} seconds`,
            client,
        });
        //Set timeout, and check which has more votes

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

        const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
        const gameMaps = await getGameMaps(match.gameType);

        gameMaps.forEach(map => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(map.name)
                    .setLabel(capitalize(map.name))
                    .setStyle(ButtonStyle.Primary)
            );
        });
        const teamBChannel = await createChannel({
            client,
            name: `Match-${match.match_number} Team B`,
            parentId: matchCategoryId,
            allowedIds: getTeam(match.players, 'b').map(p => p.id),
        });
        const mapMessage = {
            content: `Pick a map to play. Voting ends in ${VOTE_SECONDS} seconds`,
            components: [row],
        };
        const teammatesMessage = `Your teammates are: ${getTeam(match.players, 'b')
            .map(p => `<@${p.id}>`)
            .join(', ')}`;
        await sendMessage({ channelId: teamBChannel.id, messageContent: teammatesMessage, client });
        await sendMessage({
            channelId: teamBChannel.id,
            messageContent: mapMessage,
            client,
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

        // Randomly assign side and map voting to team A and B
        const random = Math.random() < 0.5;
        const teamAChannel = random
            ? await createSideVotingChannel({ client, match })
            : await createMapVotingChannel({ client, match });
        const teamBChannel = random
            ? await createMapVotingChannel({ client, match })
            : await createSideVotingChannel({ client, match });

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

        setTimeout(async () => {
            await sendMessage({
                channelId: teamAChannel,
                messageContent: "Time's up! Starting game",
                client,
            });
            await sendMessage({
                channelId: teamBChannel,
                messageContent: "Time's up! Starting game",
                client,
            });
            setTimeout(() => {
                startGame({ client, matchNumber: match.match_number });
            }, 500);
        }, VOTE_SECONDS * SECOND_IN_MS);

        resolve();
    });
};

export const startVotingPhase = (client: Client, match: IMatch): Promise<void> => {
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

        resolve();
    });
};

export const startGame = ({
    client,
    matchNumber,
}: {
    client: Client;
    matchNumber: number;
}): Promise<void> => {
    return new Promise(async resolve => {
        //create match channel
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('No match found');

        //delete voting channels
        if (match.channels.teamA) await deleteChannel({ client, channelId: match.channels.teamA });
        if (match.channels.teamB) await deleteChannel({ client, channelId: match.channels.teamB });

        const votes = await getVotes(match.players, match.gameType);

        const matchCategoryId = await getChannelId(CategoriesType.matches);
        const matchChannel = await createChannel({
            client,
            name: `Match-${match.match_number}`,
            parentId: matchCategoryId,
            allowedIds: match.players.map(p => p.id),
        });

        await Match.updateOne(
            { match_number: match.match_number },
            {
                $set: {
                    status: 'started',
                    'channels.matchChannel': matchChannel.id,
                    map: votes.map,
                    teamASide: votes.teamASide,
                },
                $unset: {
                    'channels.teamA': '',
                    'channels.teamB': '',
                },
            }
        );

        const teamsEmbed = await createMatchEmbed({ matchNumber: match.match_number });
        const regionQueueEnabled = await getRegionQueue();
        const regions = groupBy(match.players.map(p => p.region));

        let regionString;
        if (!regionQueueEnabled) {
            regionString =
                map(regions, (value, key) => {
                    return `${upperCase(key)} - ${value.length}\n`;
                }).join('') + `\n\nGame should be played on ${match.region?.toUpperCase()} region`;
        } else {
            regionString = `\n\nGame should be played on ${match.region?.toUpperCase()} region`;
        }

        await sendMessage({
            channelId: matchChannel.id,
            messageContent: { embeds: [teamsEmbed] },
            client,
        });
        await sendMessage({
            channelId: matchChannel.id,
            messageContent: regionString,
            client,
        });
    });
};

export const findByChannelId = async (channelId: string): Promise<IMatch | null> => {
    return new Promise(async resolve => {
        if (!channelId) throw new Error('No channel id provided');
        resolve(
            await Match.findOne({
                $or: [
                    { 'channels.ready': channelId },
                    { 'channels.teamAVoice': channelId },
                    { 'channels.teamBVoice': channelId },
                    { 'channels.teamA': channelId },
                    { 'channels.teamB': channelId },
                    { 'channels.matchChannel': channelId },
                ],
            })
        );
    });
};

const deleteOldScoreCard = async ({ match, client }: { match: IMatch; client: Client }) => {
    return new Promise(async resolve => {
        if (!match.channels.matchChannel) throw new Error('No match channel found');

        const channel = (await client.channels.fetch(match.channels.matchChannel)) as TextChannel;
        if (!channel) throw new Error('No channel found');

        if (!client.user) throw new Error('No client user found');

        const channelMessages = await channel.messages.fetch();
        await Promise.all(
            channelMessages.map(m => {
                return new Promise(async resolve => {
                    if (!client.user || m.author.id !== client.user.id) {
                        resolve(false);
                        return;
                    }
                    if (m.embeds.length === 0) {
                        resolve(false);
                        return;
                    }

                    if (m.embeds[0].description === 'Verify the scores below by hitting "Verify"')
                        await m.delete();

                    resolve(true);
                });
            })
        );
        resolve(true);
    });
};

export const setScore = async ({
    matchNumber,
    team,
    score,
    client,
}: {
    matchNumber: number;
    team: 'a' | 'b';
    score: number;
    client: Client;
}) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error("Couldn't find match");

        const index = team === 'a' ? 'teamARounds' : 'teamBRounds';

        await deleteOldScoreCard({ client, match });

        match[index] = score;
        match.players = match.players.map(p => ({ ...p, verifiedScore: false }));
        await match.save();

        //if both scores are set, end match
        if (match.teamARounds !== undefined && match.teamBRounds !== undefined) {
            //Ask if scores are correct
            const winScore = await getWinScore();
            const drawScore = winScore - 1;
            const { teamARounds, teamBRounds } = match;
            const isDraw = teamARounds === drawScore && teamBRounds === drawScore;
            const roundTotal = teamARounds + teamBRounds;

            // Commented out until draws are removed with config
            // if (
            //     (teamARounds !== winScore && teamBRounds !== winScore && !isDraw) ||
            //     roundTotal > drawScore * 2
            // )
            //     return;
            if (
                teamARounds !== winScore &&
                teamBRounds !== winScore &&
                !isDraw &&
                match.gameType === GameType.squads
            )
                return;

            const scoreEmbed = await createScoreCardEmbed({ match });

            const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('verify')
                    .setLabel('Verify')
                    .setStyle(ButtonStyle.Success)
            );

            const verifyContent = {
                embeds: [scoreEmbed],
                components: [row],
            };
            await sendMessage({
                channelId: match.channels.matchChannel,
                client,
                messageContent:
                    'Missing verify: ' +
                    match.players
                        .filter(p => !p.verifiedScore)
                        .map(p => `<@${p.id}>`)
                        .join(' '),
            });

            await sendMessage({
                channelId: match.channels.matchChannel,
                messageContent: verifyContent,
                client,
            });
        }
    });
};

export const checkMatchMVP = ({ matchNumber, client }: { matchNumber: number; client: Client }) => {
    const MVP_GAIN = 5;
    return new Promise(async resolve => {
        botLog({ messageContent: `Checking MVPs for ${matchNumber}`, client });

        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('No match found');

        //Get all players MVP votes, and count total of vote for each player, if 3 votes, give MVP. There can be two MVPs
        const votes = match.players.map(p => p.mvpVoteId).flat();

        const mvpVotes = groupBy(votes, v => v);

        const mvpIds = Object.keys(mvpVotes).filter(key => mvpVotes[key].length >= 3);

        if (mvpIds.length === 0) {
            botLog({ messageContent: `No MVPs found for ${matchNumber}`, client });
            return resolve(true);
        }

        botLog({ messageContent: `MVPs found for ${matchNumber}`, client });

        const mvpEmbed = new EmbedBuilder()
            .setTitle(`MVPs for match #${matchNumber}`)
            .setDescription(
                mvpIds
                    .map(id => {
                        return `<@${id}>`;
                    })
                    .join('\n')
            )
            .setTimestamp();

        //get queue channel id
        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);
        sendMessage({
            channelId: queueChannelId,
            messageContent: { embeds: [mvpEmbed] },
            client,
        });

        mvpIds.forEach(async id => {
            const player = await Player.findOne({ discordId: id });
            if (!player) return;
            await Player.updateOne(
                { discordId: id },
                {
                    $inc: { rating: MVP_GAIN },
                    $push: {
                        ratingHistory: {
                            rating: player.rating + MVP_GAIN,
                            date: Date.now(),
                            reason: `MVP for match #${matchNumber}`,
                        },
                    },
                }
            );
        });

        resolve(null);
    });
};

export const finishMatch = ({ matchNumber, client }: { matchNumber: number; client: Client }) => {
    return new Promise(async resolve => {
        botLog({ messageContent: `Finishing match ${matchNumber}`, client });

        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('No match found');

        const winScore = await getWinScore();
        const drawScore = winScore - 1;
        const isDraw =
            match.gameType === GameType.squads
                ? match.teamARounds === drawScore && match.teamBRounds === drawScore
                : match.teamARounds && match.teamBRounds && match.teamARounds === match.teamBRounds;

        if (isDraw) {
            botLog({ messageContent: `Match is a draw ${matchNumber}`, client });
            //handle draw
            sendMessage({
                channelId: match.channels.matchChannel,
                messageContent: 'Match is a draw, L',
                client,
            });
            match.players.map(p => {
                if (p.abandon) return resolve(true);
                return new Promise(async resolve => {
                    await addWinLoss({
                        client,
                        playerId: p.id,
                        result: MatchResultType.draw,
                        matchNumber: match.match_number,
                        ratingChange: 0,
                        gameType: match.gameType,
                    });
                    resolve(true);
                });
            });

            setTimeout(() => {
                end({ matchNumber, client });
            }, 5000);
            return;
        }
        if (match.teamARounds !== undefined && match.teamBRounds !== undefined) {
            botLog({ messageContent: `Match is not a draw ${matchNumber}`, client });
            const winner =
                match.teamARounds > match.teamBRounds
                    ? capitalize(match.teamASide)
                    : capitalize(await getTeamBName(match.teamASide));
            botLog({ messageContent: `Match winner ${matchNumber}: ${winner}`, client });
            sendMessage({
                channelId: match.channels.matchChannel,
                messageContent: winner + ' wins!',
                client,
            });
            setTimeout(() => {
                calculateEloChanges(match, client);
                end({ matchNumber, client });
                setTimeout(() => {
                    updateLeaderboard({ client, gameType: match.gameType });
                }, 5000);
            }, 5000);
        }
        resolve(null);
    });
};

export const end = ({
    matchNumber,
    client,
    requeuePlayers,
}: {
    matchNumber: number;
    client: Client;
    requeuePlayers?: boolean;
}) => {
    return new Promise(async resolve => {
        botLog({
            messageContent: `Ending match ${matchNumber}`,
            client,
        });
        const matches = await Match.find({ match_number: matchNumber });
        if (requeuePlayers) {
            await Promise.all(
                matches[0].players.map(async player => {
                    return new Promise(async resolve => {
                        if (player.reQueue && player.ready) {
                            await Queue.create({
                                discordId: player.id,
                                expires: Date.now() + MINUTE_IN_MS * 5,
                                signup_time: player.queueTime,
                                name: player.name,
                                rating: player.rating,
                                region: 'requeue',
                                queueRegion: 'fill',
                                gameType: matches[0].gameType,
                            });
                        }
                        resolve(true);
                    });
                })
            );
        }
        if (matches.length === 0) return;
        matches.forEach(async match => {
            match.status = 'ended';
            await match.save();
            const guild = await getGuild(client);
            try {
                botLog({
                    messageContent: `Deleting role ${match.roleId}`,
                    client,
                });
                await guild?.roles.delete(match.roleId);
            } catch (error) {
                botLog({
                    messageContent: `Error deleting role ${match.roleId}`,
                    client,
                });
            }

            Object.keys(match.channels).map(
                (key: string) =>
                    new Promise(async resolve => {
                        const channelId = match.channels[key as keyof IMatchChannels];
                        botLog({
                            messageContent: `Channel to delete ${channelId}`,
                            client,
                        });
                        if (!channelId) return resolve(true);

                        try {
                            await deleteChannel({
                                client,
                                channelId,
                            });
                        } catch (error) {
                            botLog({
                                messageContent: `Error deleting channel ${channelId}`,
                                client,
                            });
                        }
                        resolve(true);
                    })
            );

            botLog({
                messageContent: `Got scores. Team A: ${match.teamARounds} - Team B: ${match.teamBRounds}`,
                client,
            });
            if (match.teamARounds && match.teamBRounds) {
                //post match results in match-results channel
                const matchResultsChannel = await getChannelId(
                    gameTypeResultsChannels[match.gameType]
                );
                botLog({
                    messageContent: `Match results channel ${matchResultsChannel}`,
                    client,
                });
                if (!matchResultsChannel) throw new Error('No match results channel found');
                const embed = await createMatchResultEmbed({ matchNumber: match.match_number });
                botLog({
                    messageContent: `Got embed`,
                    client,
                });
                await sendMessage({
                    channelId: matchResultsChannel,
                    messageContent: { embeds: [embed] },
                    client,
                });
            }
            resolve(true);
        });
    });
};
