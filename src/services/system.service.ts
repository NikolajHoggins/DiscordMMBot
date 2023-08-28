import { ObjectId } from 'mongoose';
import System, { ISystem } from '../models/system.schema';
import { CategoriesType, ChannelsType, VCType } from '../types/channel';
import { MapType } from '../types/map.js';
import { EmotesType } from '../types/emotes.js';

const ONE_MINUTE = 60000;

export const canPing = (): Promise<true | string> => {
    return new Promise(async (resolve, reject) => {
        const config = await getConfig();

        if (config.last_ping + ONE_MINUTE * 30 < Date.now()) resolve(true);
        const remainingTime = config.last_ping + ONE_MINUTE * 30 - Date.now();
        resolve((remainingTime / ONE_MINUTE).toFixed(1));
    });
};

export const setPingCooldown = () => {
    return new Promise(async (resolve, reject) => {
        const config = await getConfig();

        await updateConfig({
            id: config._id,
            body: { last_ping: Date.now() },
        });
        resolve(true);
    });
};

export const getChannelId = (type: ChannelsType | CategoriesType | VCType): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const config = await getConfig();
        const channel = config.channels.find(t => t.name === type);
        if (!channel) throw new Error('Channel not found');

        resolve(channel.id);
    });
};

export const getConfig = (): Promise<ISystem> => {
    return new Promise(async (resolve, reject) => {
        const config = await System.findOne();
        if (!config) {
            await System.create({ last_ping: 0 });
            const newConf = await System.findOne();
            if (!newConf) throw new Error('Config broke');

            resolve(newConf);
            return;
        }

        resolve(config);
    });
};

export const updateConfig = ({
    id,
    body,
}: {
    id: ObjectId;
    body: Partial<ISystem>;
}): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        await System.updateOne({ _id: id }, body);
        resolve(true);
    });
};

export const getGameTeams = (): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
        const config = await getConfig();

        resolve(config.teams);
    });
};

export const getGameMaps = (): Promise<MapType[]> => {
    return new Promise(async (resolve, reject) => {
        const config = await getConfig();

        resolve(config.maps);
    });
};

export const getServerEmotes = (): Promise<EmotesType> => {
    return new Promise(async (resolve, reject) => {
        const config = await getConfig();

        resolve(config.emotes);
    });
};
