import { rejects } from 'assert';
import { User } from 'discord.js';
import Player, { IPlayer } from '../models/player.schema';
import Queue, { IQueue } from '../models/queue.schema';
import { RegionsType } from '../types/queue.js';

const ONE_MINUTE = 60000;

export const ready = ({
    player,
    time = 30,
    region,
    queueRegion,
}: {
    player: IPlayer;
    time?: number;
    region: string;
    queueRegion: RegionsType;
}): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const queueSpot = await getSpot(player.discordId);
        if (queueSpot) {
            //update
            await Queue.updateOne(
                { discordId: player.discordId },
                { expires: Date.now() + ONE_MINUTE * time }
            );
            return resolve(true);
        }

        const newSpot = new Queue({
            discordId: player.discordId,
            expires: Date.now() + ONE_MINUTE * time,
            signup_time: Date.now(),
            name: player.name,
            rating: player.rating,
            region: region,
            queueRegion: queueRegion,
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
