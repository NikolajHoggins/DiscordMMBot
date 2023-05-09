import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    Guild,
    MessageActionRowComponentBuilder,
    TextChannel,
    User,
} from 'discord.js';
import { updateStatus } from '../crons/updateQueue';
import { createReadyMessage, sendMessage } from '../helpers/messages';
import Match, { IMatch, IMatchChannels, MatchStatus } from '../models/match.schema';
import Queue, { IQueue } from '../models/queue.schema';
import { removePlayersFromQueue } from './queue.service';
import { getGuild } from '../helpers/guild';
import { createTeams, getTeam } from '../helpers/players';
import { logMatch } from '../helpers/logs';
import { getChannelId } from './system.service';
import { CategoriesType, ChannelsType } from '../types/channel';
import { updateLeaderboard } from '../helpers/leaderboard';
import { createMatchEmbed, createMatchResultEmbed, createScoreCardEmbed } from '../helpers/embed';
import { calculateEloChanges } from '../helpers/elo.js';
import { deleteChannel, createChannel } from '../helpers/channel.js';
import { getVotes } from '../helpers/match.js';
import { capitalize, groupBy, map, upperCase } from 'lodash';
import { getTeamBName } from '../helpers/team.js';
import { addBan, addWinLoss } from './player.service.js';
import { MatchResultType } from '../models/player.schema.js';
import { BansType } from '../types/bans.js';
const DEBUG_MODE = false;

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
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
        const playersMessage = await sendMessage({
            channelId: match.channels.ready,
            client,
            messageContent:
                'Missing players: ' +
                match.players
                    .filter(p => !p.ready)
                    .map(p => `<@${p.id}>`)
                    .join(' '),
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
            await Promise.all(
                unreadyPlayers.map(player => {
                    return new Promise(async resolve => {
                        addBan({
                            client,
                            reason: `Failed to accept match ${match.match_number}`,
                            type: BansType.ready,
                            userId: player.id,
                        });
                        resolve(true);
                    });
                })
            );

            setTimeout(() => {
                console.log('here');
                end({ matchNumber: match.match_number, client });
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
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('Match not found');
        const verifiedPlayersCount = match.players.filter(p => p.verifiedScore === true).length;
        const totalNeeded = match.players.length / 2 + 1;

        if (verifiedPlayersCount >= totalNeeded) {
            await sendMessage({
                channelId: match.channels.matchChannel,
                messageContent: 'All players have verified score',
                client: client,
            });
            await finishMatch({
                matchNumber: match.match_number,
                client: client,
            });
        }
    });
};

export const tryStart = (client: Client): Promise<void> => {
    return new Promise(async resolve => {
        if (!process.env.SERVER_ID) throw new Error('No server id');

        const queueChannelId = await getChannelId(ChannelsType['ranked-queue']);

        const queue = await Queue.find().sort({ signup_time: 1 });
        const count = DEBUG_MODE ? 1 : 10;
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
            });
        }
        if (euPlayers.length >= count) {
            return await startMatch({
                client,
                queue: [...euPlayers, ...fillPlayers],
                count,
                queueChannelId,
                region: 'eu',
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
            });
        }
        if (naPlayers.length + fillPlayers.length >= count) {
            return await startMatch({
                client,
                queue: [...naPlayers, ...fillPlayers],
                count,
                queueChannelId,
                region: 'na',
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

const startMatch = ({
    queue,
    count,
    queueChannelId,
    client,
    region,
}: {
    queue: IQueue[];
    count: number;
    queueChannelId: string;
    client: Client;
    region: string;
}) => {
    return new Promise(async resolve => {
        const sortedPlayers = queue.sort((a, b) => {
            return a.signup_time - b.signup_time;
        });
        const queuePlayers = sortedPlayers.slice(0, count);

        // const ratingDiff =
        //     sortedPlayers.length > 2 ? sortedPlayers[-1].rating - sortedPlayers[0].rating : 0;

        await sendMessage({
            channelId: queueChannelId,
            messageContent:
                count + ` players in queue - Game is starting on region ${region.toUpperCase()}`,
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
        });
        await newMatch.save();

        await createVCs({ client, match: newMatch });

        logMatch({ match: newMatch, client });

        //Remove players from queue
        await removePlayersFromQueue(queuePlayers);
        await updateStatus(client);
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
        const teams = process.env.GAME_TEAMS;
        if (!teams || !teams.includes(',')) throw new Error('No teams found in env');
        teams.split(',').forEach(team => {
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

        const sideMessage = {
            content: 'Pick a side to start on. Voting ends in 20 seconds',
            components: [row],
        };
        const teammatesMessage = `Your teammates are: ${getTeam(match.players, 'a')
            .map(p => `<@${p.id}>`)
            .join(', ')}`;
        await sendMessage({ channelId: teamAChannel.id, messageContent: teammatesMessage, client });
        await sendMessage({ channelId: teamAChannel.id, messageContent: sideMessage, client });
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
        const maps = process.env.GAME_MAPS;
        if (!maps || !maps.includes(',')) throw new Error('No maps found in env');
        maps.split(',').forEach(map => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(map)
                    .setLabel(capitalize(map))
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
            content: 'Pick a map to play. Voting ends in 20 seconds',
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
        }, 20000);

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

        const votes = await getVotes(match.players);

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

        const regions = groupBy(match.players.map(p => p.region));

        const regionString =
            map(regions, (value, key) => {
                return `${upperCase(key)} - ${value.length}\n`;
            }).join('') + `\n\nGame should be played on ${match.region?.toUpperCase()} region`;

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
            const { teamARounds, teamBRounds } = match;
            const isDraw = teamARounds === 6 && teamBRounds === 6;
            const roundTotal = teamARounds + teamBRounds;

            if ((teamARounds !== 7 && teamBRounds !== 7 && !isDraw) || roundTotal > 12) return;

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
                messageContent: verifyContent,
                client,
            });
        }
    });
};

export const finishMatch = ({ matchNumber, client }: { matchNumber: number; client: Client }) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) throw new Error('No match found');

        if (match.teamARounds === 6 && match.teamBRounds === 6) {
            //handle draw
            sendMessage({
                channelId: match.channels.matchChannel,
                messageContent: 'Match is a draw, L',
                client,
            });
            await Promise.all(
                match.players.map(p => {
                    return new Promise(async resolve => {
                        await addWinLoss({
                            client,
                            playerId: p.id,
                            result: MatchResultType.draw,
                            matchNumber: match.match_number,
                            ratingChange: 0,
                        });
                        resolve(true);
                    });
                })
            );
            setTimeout(() => {
                end({ matchNumber, client });
            }, 5000);
            return;
        }
        if (match.teamARounds !== undefined && match.teamBRounds !== undefined) {
            const winner =
                match.teamARounds > match.teamBRounds
                    ? capitalize(match.teamASide)
                    : capitalize(getTeamBName(match.teamASide));
            sendMessage({
                channelId: match.channels.matchChannel,
                messageContent: winner + ' wins!',
                client,
            });
            setTimeout(() => {
                calculateEloChanges(match, client);
                end({ matchNumber, client });
                setTimeout(() => {
                    updateLeaderboard({ client });
                }, 5000);
            }, 5000);
        }
        resolve(null);
    });
};

export const end = ({ matchNumber, client }: { matchNumber: number; client: Client }) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) return;
        match.status = 'ended';
        await match.save();
        const guild = await getGuild(client);
        try {
            await guild?.roles.delete(match.roleId);
        } catch (error) {
            console.log('error deleting role', match.roleId);
        }

        await Promise.all(
            Object.keys(match.channels).map(
                (key: string) =>
                    new Promise(async resolve => {
                        const channelId = match.channels[key as keyof IMatchChannels];
                        if (!channelId) return resolve(true);

                        try {
                            await deleteChannel({
                                client,
                                channelId,
                            });
                        } catch (error) {
                            console.log('error deletint channel', channelId);
                        }
                        resolve(true);
                    })
            )
        );
        //post match results in match-results channel
        const matchResultsChannel = await getChannelId(ChannelsType['match-results']);
        if (!matchResultsChannel) throw new Error('No match results channel found');
        const embed = await createMatchResultEmbed({ matchNumber: match.match_number });
        await sendMessage({
            channelId: matchResultsChannel,
            messageContent: { embeds: [embed] },
            client,
        });
    });
};
