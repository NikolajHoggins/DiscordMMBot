import { Schema, model, connect, ObjectId } from 'mongoose';
import { ChannelType, RankType } from '../types/channel';
import { MapType } from '../types/map.js';
import { EmotesType } from '../types/emotes.js';

// 1. Create an interface representing a document in MongoDB.
export interface ISystem {
    last_ping: number;
    channels: ChannelType[];
    roles: RankType[];
    maps: MapType[];
    teams: string[];
    emotes: EmotesType;
    _id: ObjectId;
}

// 2. Create a Schema corresponding to the document interface.
const systemSchema = new Schema<ISystem>({
    last_ping: { type: Number, required: true },
    channels: { type: [], required: true },
    roles: { type: [], required: true },
    maps: { type: [], required: true },
    teams: { type: [], required: true },
    emotes: { type: {}, required: true },
});

const System = model<ISystem>('System', systemSchema);

export default System;
