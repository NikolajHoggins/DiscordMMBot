import { User } from 'discord.js';
import Player, { IPlayer } from '../models/player.schema';
import Queue, { IQueue } from '../models/queue.schema';

export const ready = (player: IPlayer): Promise<IQueue> => {
    return new Promise(async (resolve, reject) => {
        const queueSpot = await Queue.findOne({ discordId: player.discordId });
        if (queueSpot) {
            await Queue.deleteOne({ discordId: player.discordId });
        }
        const newSpot = new Queue({
            discordId: player.discordId,
            expires: Date.now() + 1800000,
            name: player.name,
        });

        newSpot.save();

        resolve(newSpot);
    });
};
