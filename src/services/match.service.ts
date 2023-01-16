import {
    Client,
    Guild,
    PermissionsBitField,
    ReactionEmoji,
    Role,
    User,
    UserFlags,
} from 'discord.js';
import { updateStatus } from '../crons/updateQueue';
import { sendMessage } from '../helpers/messages';
import Match, { IMatch } from '../models/match.schema';
import Queue, { IQueue } from '../models/queue.schema';
import { shuffle } from 'lodash';

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

const removePlayersFromQueue = async (queuePlayers: IQueue[]): Promise<void> => {
    return new Promise(async resolve => {
        for (const i in queuePlayers) {
            const player = queuePlayers[i];
            await Queue.deleteOne({ discordId: player.discordId });
        }

        resolve();
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
        readyMessage.awaitReactions({ filter, time: timeToReadyInMs });
    });
};

export const tryStart = (client: Client): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!process.env.SERVER_ID || !process.env.MATCH_CATEGORY || !process.env.QUEUE_CHANNEL)
            return;

        const queue = await Queue.find().sort({ signup_time: -1 });

        const count = 2;

        if (queue.length >= count) {
            const queuePlayers = queue.slice(0, count);

            await sendMessage({
                channelId: process.env.QUEUE_CHANNEL,
                messageContent: count + ' players in queue - Game is starting',
                client,
            });

            const guild = await client.guilds.fetch(process.env.SERVER_ID);

            const newNumber = await getNewMatchNumber();

            const everyone = await guild.roles.fetch(process.env.SERVER_ID);

            if (!everyone) return;

            const { channelId, roleId } = await createChannel({
                guild,
                everyoneRole: everyone,
                queuePlayers,
                matchNumber: newNumber,
            });

            const newMatch = new Match({
                match_number: newNumber,
                start: Date.now(),
                playerIds: queuePlayers.map(p => p.discordId),
                channelId: channelId,
                roleId: roleId,
            });
            await newMatch.save();

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
        const players = shuffle(match.playerIds);
        const teamOne = players.slice(0, players.length / 2);
        const teamTwo = players.slice(players.length / 2, players.length);

        await sendMessage({
            channelId: match.channelId,
            messageContent: 'All players ready, game is starting',
            client,
        });
        await sendMessage({
            channelId: match.channelId,
            messageContent: `Team one: ${teamOne.map(p => `<@${p}>,`)}`,
            client,
        });
        await sendMessage({
            channelId: match.channelId,
            messageContent: `Team two: ${teamTwo.map(p => `<@${p}>,`)}`,
            client,
        });

        //Create vc for each team

        resolve();
    });
};

export const findByChannelId = async (channelId: string): Promise<IMatch | null> => {
    return new Promise(async resolve => {
        resolve(await Match.findOne({ channelId: channelId }));
    });
};
