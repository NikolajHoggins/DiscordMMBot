import { Client, EmbedBuilder, Guild, PermissionsBitField, Role, User } from 'discord.js';
import { updateStatus } from '../crons/updateQueue';
import { sendMessage } from '../helpers/messages';
import Match, { IMatch } from '../models/match.schema';
import Queue, { IQueue } from '../models/queue.schema';
import { removePlayersFromQueue } from './queue.service';
import { getGuild } from '../helpers/guild';
import { createTeams } from '../helpers/players';
import { logMatch } from '../helpers/logs';
import { createTeamsEmbed } from '../helpers/embed';

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
        // create new role
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
            parent: process.env.MATCH_CATEGORY,
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
            sendMessage({
                channelId,
                messageContent: `${q.map(
                    player => `<@${player}>,`
                )} failed to accept the match, ending game`,
                client,
            });

            sendMessage({
                channelId: process.env.QUEUE_CHANNEL,
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
        if (!process.env.SERVER_ID || !process.env.MATCH_CATEGORY || !process.env.QUEUE_CHANNEL)
            return;

        const queue = await Queue.find().sort({ signup_time: -1 });

        const count = 10;

        if (queue.length >= count) {
            const queuePlayers = queue.slice(0, count);

            await sendMessage({
                channelId: process.env.QUEUE_CHANNEL,
                messageContent: count + ' players in queue - Game is starting',
                client,
            });

            const guild = await getGuild(client);
            if (!guild) return;

            const newNumber = await getNewMatchNumber();

            const everyone = await guild.roles.fetch(process.env.SERVER_ID);

            if (!everyone) return;

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
        const { teamA, teamB } = match;
        await sendMessage({
            channelId: match.channelId,
            messageContent: 'All players ready, game is starting',
            client,
        });

        const teamsEmbed = createTeamsEmbed({ teamA, teamB });

        const matchStats = new EmbedBuilder()
            .setTitle('Submit score')
            .setDescription('Submit scores here when game is over')
            .addFields(
                { name: 'Vote Team A', value: '🇦', inline: true },
                { name: 'Vote Team B', value: '🇧', inline: true }
            );

        const message = await sendMessage({
            channelId: match.channelId,
            messageContent: { embeds: [teamsEmbed, matchStats] },
            client,
        });

        if (!message) return;

        message.react('🇦');
        message.react('🇧');

        resolve();
    });
};

export const findByChannelId = async (channelId: string): Promise<IMatch | null> => {
    return new Promise(async resolve => {
        resolve(await Match.findOne({ channelId: channelId }));
    });
};

export const setWinner = async ({
    matchNumber,
    winner,
}: {
    matchNumber: number;
    winner: 'a' | 'b';
}): Promise<void> => {
    return new Promise(async resolve => {
        const match = await Match.find({ match_number: matchNumber });
        if (match) await Match.updateOne({ match_number: matchNumber }, { winner });

        resolve();
    });
};

export const end = async ({ matchNumber, client }: { matchNumber: number; client: Client }) => {
    return new Promise(async resolve => {
        const match = await Match.findOne({ match_number: matchNumber });
        if (!match) return;
        const guild = await getGuild(client);
        await guild?.roles.delete(match.roleId);

        await guild?.channels.delete(match.channelId);
    });
};
