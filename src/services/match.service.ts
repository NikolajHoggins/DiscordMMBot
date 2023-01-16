import { Client, Guild, PermissionsBitField, ReactionEmoji, Role, User } from 'discord.js';
import { updateStatus } from '../crons/updateQueue';
import { sendMessage } from '../helpers/messages';
import Match from '../models/match.schema';
import Queue, { IQueue } from '../models/queue.schema';

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
}): Promise<string> => {
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

        resolve(matchChannel.id);
    });
};

const sendReadyMessage = async ({
    channelId,
    client,
    queuePlayers,
}: {
    channelId: string;
    client: Client;
    queuePlayers: IQueue[];
}): Promise<void> => {
    return new Promise(async () => {
        const readyMessage = await sendMessage({
            channelId,
            messageContent: 'Game has been found, you have 5 minutes to ready up',
            client,
        });

        let q = queuePlayers.map(q => q.discordId);
        readyMessage.react('✅');
        //     .then(async msg => {

        //     await msg.awaitReactions({});
        //     const filter = () => true;
        //     const collector = msg.createReactionCollector({ filter, time: 15_000 });
        //     collector.on('collect', r => console.log(`Collected ${r.emoji.name}`));
        //     collector.on('end', collected => console.log(`Collected ${collected.size} items`));
        const filter = (reaction: any, user: User) => {
            console.log(
                user.id,
                queuePlayers.map(q => q.discordId)
            );

            q = q.filter(id => id !== user.id);

            if (q.length <= 0) {
                sendMessage({
                    channelId,
                    messageContent: 'GAME IS STARTING',
                    client,
                });
            }
            if (queuePlayers.find(q => q.discordId === user.id)) return true;
            return false;
        };
        readyMessage
            .awaitReactions({ filter, time: 15_000 })
            .then(collected => {
                console.log(`Collected ${collected.size} reactions`);
            })
            .catch(console.error);
        // });
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

            const channelId = await createChannel({
                guild,
                everyoneRole: everyone,
                queuePlayers,
                matchNumber: newNumber,
            });

            const newMatch = new Match({
                match_number: newNumber,
                start: Date.now(),
                playerIds: queuePlayers.map(p => p.discordId),
                threadId: channelId,
            });
            await newMatch.save();

            //Remove players from queue
            await removePlayersFromQueue(queuePlayers);
            await updateStatus(client);
            await sendReadyMessage({ client, channelId, queuePlayers });
        }

        resolve();
    });
};
