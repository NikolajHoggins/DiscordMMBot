import { Schema, model, connect } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface IQueue {
    discordId: string;
    expires: number;
    signup_time: number;
    name: string;
}

// 2. Create a Schema corresponding to the document interface.
const queueSchema = new Schema<IQueue>({
    discordId: { type: String, required: true },
    expires: { type: Number, required: true },
    signup_time: { type: Number, required: true },
    name: { type: String, required: true },
});

const Queue = model<IQueue>('Queue', queueSchema);

export default Queue;
