import { Schema, model, connect, ObjectId } from 'mongoose';
import { ChannelType, RankType } from '../types/channel';
import { MapType } from '../types/map.js';
import { EmotesType } from '../types/emotes.js';

// 1. Create an interface representing a document in MongoDB.
export interface ISystem {
    last_ping: number;
    channels: ChannelType[];
    regionQueue: boolean;
    duelsEnabled: boolean;
    roles: RankType[];
    maps: MapType[];
    duelsMaps: MapType[];
    teams: string[];
    emotes: EmotesType;
    winScore: number;
    _id: ObjectId;
}

// 2. Create a Schema corresponding to the document interface.
const systemSchema = new Schema<ISystem>({
    last_ping: { type: Number, required: true },
    channels: { type: [], required: true },
    roles: { type: [], required: true },
    maps: { type: [], required: true },
    duelsEnabled: { type: Boolean, required: true },
    duelsMaps: { type: [], required: true },
    teams: { type: [], required: true },
    emotes: { type: {}, required: true },
    regionQueue: { type: Boolean, required: true },
    winScore: { type: Number, required: true },
});

const System = model<ISystem>('System', systemSchema);

export default System;
