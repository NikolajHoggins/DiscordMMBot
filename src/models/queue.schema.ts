import { Schema, model, connect } from 'mongoose';
import { GameType, RegionsType } from '../types/queue.js';

// 1. Create an interface representing a document in MongoDB.
export interface IQueue {
    discordId: string;
    expires: number;
    signup_time: number;
    name: string;
    rating: number;
    queueRegion: RegionsType;
    region: string;
    gameType: GameType;
}

// 2. Create a Schema corresponding to the document interface.
const queueSchema = new Schema<IQueue>({
    discordId: { type: String, required: true },
    expires: { type: Number, required: true },
    signup_time: { type: Number, required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    region: { type: String, required: true },
    queueRegion: { type: String },
    gameType: { type: String, required: true },
});

const Queue = model<IQueue>('Queue', queueSchema);

export default Queue;
