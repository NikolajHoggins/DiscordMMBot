import { Schema, model, connect, ObjectId } from 'mongoose';
import { ChannelsType, ChannelType } from '../types/channel.js';

// 1. Create an interface representing a document in MongoDB.
export interface ISystem {
    last_ping: number;
    channels: ChannelType[];
    _id: ObjectId;
}

// 2. Create a Schema corresponding to the document interface.
const systemSchema = new Schema<ISystem>({
    last_ping: { type: Number, required: true },
    channels: { type: [], required: true },
});

const System = model<ISystem>('System', systemSchema);

export default System;
