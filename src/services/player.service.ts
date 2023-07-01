import { Client, User } from 'discord.js';
import Player, { IPlayer, MatchResultType } from '../models/player.schema';
import { checkRank } from '../helpers/rank.js';
import { BansType, banTimes } from '../types/bans.js';
import Queue from '../models/queue.schema.js';
import { getChannelId } from './system.service.js';
import { ChannelsType } from '../types/channel.js';
import { sendMessage } from '../helpers/messages.js';

export const findOrCreate = (user: User): Promise<IPlayer> => {
    return new Promise(async (resolve, reject) => {
        const player = (await Player.findOne({ discordId: user.id })) as IPlayer;
        if (player) {
            resolve(player);
            return;
        }

        const newPlayer = new Player({
            discordId: user.id,
            name: user.username,
            rating: 1350,
            ratingHistory: [],
            history: [],
        });
        await newPlayer.save();

        resolve(newPlayer);
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

export const addWinLoss = async ({
    playerId,
    matchNumber,
    ratingChange,
    result,
    client,
}: {
    playerId: string;
    matchNumber: number;
    ratingChange: number;
    result: MatchResultType;
    client: Client;
}): Promise<void> => {
    return new Promise(async resolve => {
        const player = await get(playerId);

        if (!player) return;

        await Player.updateOne(
            { discordId: playerId },
            {
                history: [...player.history, { matchNumber, result, change: ratingChange }],
                rating: player.rating + Math.round(ratingChange * 100) / 100,
                ratingHistory: [
                    ...(player.ratingHistory || []),
                    {
                        rating: player.rating + Math.round(ratingChange * 100) / 100,
                        date: Date.now(),
                        reason: `Match ${matchNumber} ${result}`,
                    },
                ],
            }
        );

        await checkRank({ client, playerId: player.discordId });

        resolve();
    });
};

export const idsToObjects = (players: string[]): Promise<IPlayer>[] => {
    return players.map(
        p =>
            new Promise(async resolve => {
                const player = (await Player.findOne({ discordId: p })) as IPlayer;
                resolve(player);
            })
    );
};

export const addBan = ({
    duration,
    reason,
    userId,
    type,
    modId,
    client,
}: {
    duration?: number;
    reason: string;
    userId: string;
    type: BansType;
    modId?: string;
    client: Client;
}) => {
    return new Promise(async (resolve, reject) => {
        const player = (await Player.findOne({ discordId: userId })) as IPlayer;
        if (!player) {
            reject('Player not found');
            return;
        }

        await Queue.deleteOne({ discordId: userId });

        const previousOffenses = player.bans.filter((b: any) => b.type === type).length;
        const actualDuration = duration || banTimes[type] * (previousOffenses + 1);

        const now = Date.now();
        const timeoutEnd = now + actualDuration * 60 * 1000;
        const banBody = {
            startTime: now,
            reason: reason,
            timeoutInMinutes: duration,
            type,
            ...(type === BansType.mod ? { modId: modId } : {}),
        };
        await Player.updateOne(
            { discordId: userId },
            {
                $set: { banStart: now, banEnd: timeoutEnd },
                ...(player.bans
                    ? {
                          $push: {
                              bans: banBody,
                          },
                      }
                    : { $set: { bans: [banBody] } }),
            }
        );

        //Send message in queue channel

        const message = `<@${userId}> has been timed out for ${actualDuration} minutes due to "${reason}"`;

        const queueChannel = await getChannelId(ChannelsType['ranked-queue']);
        await sendMessage({
            channelId: queueChannel,
            messageContent: message,
            client,
        });
        resolve(true);
    });
};
