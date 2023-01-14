import { User } from 'discord.js';
import Player, { IPlayer } from '../models/player.schema';
import Queue, { IQueue } from '../models/queue.schema';

const ONE_MINUTE = 60000;

export const ready = ({
    player,
    time = 30,
}: {
    player: IPlayer;
    time?: number;
}): Promise<IQueue> => {
    return new Promise(async (resolve, reject) => {
        const queueSpot = await Queue.findOne({ discordId: player.discordId });
        if (queueSpot) {
            await Queue.deleteOne({ discordId: player.discordId });
        }

        const newSpot = new Queue({
            discordId: player.discordId,
            expires: Date.now() + ONE_MINUTE * time,
            name: player.name,
        });

        newSpot.save();

        resolve(newSpot);
    });
};
