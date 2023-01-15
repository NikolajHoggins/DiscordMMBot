import { Client, PermissionOverwrites, PermissionsBitField, TextChannel, User } from 'discord.js';
import Match from '../models/match.schema';
import Player, { IPlayer } from '../models/player.schema';
import Queue from '../models/queue.schema';

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

export const tryStart = (client: Client): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!process.env.SERVER_ID || !process.env.MATCH_CATEGORY) return;

        const queue = await Queue.find().sort({ signup_time: -1 });

        const count = 1;
        if (queue.length >= count) {
            const queuePlayers = queue.slice(0, count);

            sendStartingMessage({ client, count });

            const guild = await client.guilds.fetch(process.env.SERVER_ID);

            const newNumber = await getNewMatchNumber();

            const newMatch = new Match({
                match_number: newNumber,
                start: Date.now(),
                playerIds: queuePlayers.map(p => p.discordId),
            });
            console.log(newMatch);

            await newMatch.save();

            const everyone = await guild.roles.fetch(process.env.SERVER_ID);

            if (!everyone) return;
            console.log(everyone.id);

            const matchChannel = await guild.channels.create({
                name: `Match-${newMatch.match_number}`,
                permissionOverwrites: [
                    { id: everyone.id, deny: PermissionsBitField.Flags.ReadMessageHistory },
                ],
                parent: process.env.MATCH_CATEGORY,
            });
            // for (const i in queue) {
            //     console.log('permissions for ', i);
            //     await matchChannel.permissionOverwrites.set([
            //         {
            //             id: queue[i].discordId,
            //             allow: PermissionsBitField.Flags.ViewChannel,
            //         },
            //     ]);
            // }
            // const playerPermissions = queue.map(q => ({
            //     id: q.discordId,
            //     allow: PermissionsBitField.Flags.ViewChannel,
            // }));

            // matchChannel.permissionOverwrites();
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
