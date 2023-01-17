import { User } from 'discord.js';
import Player, { IPlayer } from '../models/player.schema';

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

export const addWinLoose = async ({
    playerId,
    won,
}: {
    playerId: string;
    won: boolean;
}): Promise<void> => {
    return new Promise(async resolve => {
        const player = await get(playerId);

        if (!player) return;

        await Player.updateOne(
            { discordId: playerId },
            won ? { wins: player.wins + 1 } : { losses: player.losses + 1 }
        );
        resolve();
    });
};
