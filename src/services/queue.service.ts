import { rejects } from 'assert';
import { User } from 'discord.js';
import Player, { IPlayer } from '../models/player.schema';
import Queue, { IQueue } from '../models/queue.schema';
import { GameType, RegionsType } from '../types/queue.js';

const ONE_MINUTE = 60000;

export const ready = ({
    player,
    time = 30,
    region,
    queueRegion,
    gameType,
}: {
    player: IPlayer;
    time?: number;
    region: string;
    queueRegion: RegionsType;
    gameType: GameType;
}): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const queueSpot = await getSpot(player.discordId);
        if (queueSpot) {
            //update
            await Queue.updateOne(
                { discordId: player.discordId },
                { expires: Date.now() + ONE_MINUTE * time, queueRegion, gameType }
            );
            return resolve(true);
        }

        // Good chance new unranked players suck.
        // Now they count for 0.5 of their rating for the first match, and then for the next 4 matches their multiplier moves towards 1. So 0.5 - 0.625 - 0.75 - 0.825 - 1.0
        const effectiveRating =
            player.history.length >= 4
                ? player.rating
                : player.rating * (0.5 + player.history.length / 8);

        const newSpot = new Queue({
            discordId: player.discordId,
            expires: Date.now() + ONE_MINUTE * time,
            signup_time: Date.now(),
            name: player.name,
            rating: effectiveRating,
            region: region,
            queueRegion: queueRegion,
            gameType,
        });

        newSpot.save();

        resolve(true);
    });
};
export const unReady = async ({ discordId }: { discordId: string }): Promise<void> => {
    const queueSpot = await getSpot(discordId);

    if (queueSpot) {
        await Queue.deleteOne({ discordId });
    }
};

export const getSpot = (discordId: string): Promise<IQueue | void> => {
    return new Promise((resolve, reject) => {
        Queue.findOne({ discordId }).then(resp => {
            if (resp) resolve(resp);
            resolve();
        });
    });
};

export const get = (): Promise<IQueue[]> => {
    return new Promise(async (resolve, reject) => {
        Queue.find().then(resp => resolve(resp));
    });
};

export const removePlayersFromQueue = async (queuePlayers: IQueue[]): Promise<void> => {
    return new Promise(async resolve => {
        for (const i in queuePlayers) {
            const player = queuePlayers[i];
            await Queue.deleteOne({ discordId: player.discordId });
        }

        resolve();
    });
};
