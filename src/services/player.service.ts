import { Client, User } from 'discord.js';
import Player, { IPlayer, MatchResultType } from '../models/player.schema';
import { checkRank } from '../helpers/rank.js';

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
            rating: 1000,
            wins: 0,
            losses: 0,
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
