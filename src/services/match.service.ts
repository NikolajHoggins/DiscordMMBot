import {
    Client,
    Guild,
    PermissionOverwrites,
    PermissionsBitField,
    TextChannel,
    User,
} from 'discord.js';
import { updateStatus } from '../crons/updateQueue';
import Match from '../models/match.schema';
import Player, { IPlayer } from '../models/player.schema';
import Queue, { IQueue } from '../models/queue.schema';

const sendStartingMessage = async ({ client, count }: { client: Client; count: number }) => {
    if (!process.env.QUEUE_CHANNEL) return;

    const channel = await client.channels.fetch(process.env.QUEUE_CHANNEL).then(resp => resp);
    (channel as TextChannel).send(count + ' players in queue - Game is starting');
};

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

export const tryStart = (client: Client): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!process.env.SERVER_ID || !process.env.MATCH_CATEGORY) return;

        const queue = await Queue.find().sort({ signup_time: -1 });

        const count = 2;

        if (queue.length >= count) {
            const queuePlayers = queue.slice(0, count);

            sendStartingMessage({ client, count });

            const guild = await client.guilds.fetch(process.env.SERVER_ID);

            const newNumber = await getNewMatchNumber();

            const everyone = await guild.roles.fetch(process.env.SERVER_ID);

            if (!everyone) return;

            const newRole = await setPermissions({
                guild,
                matchNumber: newNumber,
                queuePlayers,
            });
            const matchChannel = await guild.channels.create({
                name: `Match-${newNumber}`,
                permissionOverwrites: [
                    {
                        id: everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: newRole,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    },
                ],
                parent: process.env.MATCH_CATEGORY,
            });

            const newMatch = new Match({
                match_number: newNumber,
                start: Date.now(),
                playerIds: queuePlayers.map(p => p.discordId),
                threadId: matchChannel.id,
            });
            await newMatch.save();

            //Remove players from queue
            await removePlayersFromQueue(queuePlayers);
            await updateStatus(client);
        }

        resolve();
    });
};

export const get = (discordId: string): Promise<IPlayer> => {
    return new Promise(async (resolve, reject) => {
        const player = (await Player.findOne({ discordId })) as IPlayer;
        resolve(player);
    });
};

export const create = (data: IPlayer): Promise<IPlayer> => {
    return new Promise(async (resolve, reject) => {
        const player = new Player(data);
        await player.save();

        resolve(player);
    });
};
