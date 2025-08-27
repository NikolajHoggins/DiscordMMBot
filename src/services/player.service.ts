import { Client, User } from 'discord.js';
import Player, { IPlayer, MatchResultType } from '../models/player.schema';
import { checkRank } from '../helpers/rank';
import { BansType, banTimes } from '../types/bans';
import Queue from '../models/queue.schema';
import { getChannelId } from './system.service';
import { ChannelsType } from '../types/channel';
import { botLog, sendMessageInChannel } from '../helpers/messages';
import { GameType, gameTypeRatingKeys } from '../types/queue';

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
            duelsRating: 1350,
            duelsRatingHistory: [],
            duelsHistory: [],
            avatarUrl: user.displayAvatarURL(),
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
    gameType,
}: {
    playerId: string;
    matchNumber: number;
    ratingChange: number;
    result: MatchResultType;
    client: Client;
    gameType: GameType;
}): Promise<void> => {
    return new Promise(async resolve => {
        const player = await get(playerId);

        if (!player) return;
        botLog({ messageContent: `Adding win / loss to ${player.name}`, client });

        const ratingHistoryKey = gameTypeRatingKeys[gameType].ratingHistory as
            | 'ratingHistory'
            | 'duelsRatingHistory';

        const ratingKey = gameTypeRatingKeys[gameType].rating as 'rating' | 'duelsRating';
        const historyKey = gameTypeRatingKeys[gameType].history as 'history' | 'duelsHistory';

        if (!(ratingHistoryKey in player) || !(ratingKey in player)) return;

        await Player.updateOne(
            { discordId: playerId },
            {
                [historyKey]: [
                    ...player[historyKey],
                    { matchNumber, result, change: ratingChange },
                ],
                [gameTypeRatingKeys[gameType].rating]:
                    player[ratingKey] + Math.round(ratingChange * 100) / 100,
                [gameTypeRatingKeys[gameType].ratingHistory]: [
                    ...(player[ratingHistoryKey] || []),
                    {
                        rating: player[ratingKey] + Math.round(ratingChange * 100) / 100,
                        date: Date.now(),
                        reason: `Match ${matchNumber} ${result}`,
                    },
                ],
                lastMatch: Date.now(),
            }
        );
        botLog({ messageContent: `${player.name} Updated succesfully`, client });

        if (gameType === GameType.squads) {
            checkRank({ client, playerId: player.discordId });
        }

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
    display,
}: {
    duration?: number;
    reason: string;
    userId: string;
    type: BansType;
    modId?: string;
    client: Client;
    display?: boolean;
}) => {
    return new Promise(async (resolve, reject) => {
        const player = (await Player.findOne({ discordId: userId })) as IPlayer;
        if (!player) {
            reject('Player not found');
            return;
        }

        await Queue.deleteOne({ discordId: userId });

        const BAN_SCALER = 2.5; //Each time offense is committed, ban duration is multiplied by this number
        const actualDuration =
            duration || banTimes[type] * BAN_SCALER ** (player.banMultiplier || 0);

        const now = Date.now();
        const timeoutEnd = now + actualDuration * 60 * 1000;
        const banBody = {
            startTime: now,
            reason: reason,
            timeoutInMinutes: actualDuration,
            type,
            ...(type === BansType.mod ? { modId: modId } : {}),
        };
        await Player.updateOne(
            { discordId: userId },
            {
                $set: { banStart: now, banEnd: timeoutEnd, banTickDown: timeoutEnd },
                $inc: { banMultiplier: 1 },
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

        if (display) {
            const message = `<@${userId}> has been timed out for ${actualDuration} minutes due to "${reason}"`;

            const queueChannel = await getChannelId(ChannelsType['ranked-queue']);
            await sendMessageInChannel({
                channelId: queueChannel,
                messageContent: message,
                client,
            });
        }
        resolve(true);
    });
};

export const addNote = ({
    note,
    userId,
    modId,
}: {
    note: string;
    userId: string;
    modId?: string;
}) => {
    return new Promise(async (resolve, reject) => {
        const player = (await Player.findOne({ discordId: userId })) as IPlayer;
        if (!player) {
            reject('Player not found');
            return;
        }

        const now = Date.now();
        const noteBody = {
            time: now,
            note: note,
            modId: modId,
        };
        await Player.updateOne(
            { discordId: userId },
            {
                ...(player.notes
                    ? {
                          $push: {
                              notes: noteBody,
                          },
                      }
                    : { $set: { notes: [noteBody] } }),
            }
        );

        resolve(true);
    });
};
