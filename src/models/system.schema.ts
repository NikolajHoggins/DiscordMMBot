import { Schema, model, connect, ObjectId } from 'mongoose';

// 1. Create an interface representing a document in MongoDB.
export interface ISystem {
    last_ping: number;
    _id: ObjectId;
}

// 2. Create a Schema corresponding to the document interface.
const systemSchema = new Schema<ISystem>({
    last_ping: { type: Number, required: true },
});

const System = model<ISystem>('System', systemSchema);

export default System;
