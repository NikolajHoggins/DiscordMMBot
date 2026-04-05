import { Schema, model, Document } from 'mongoose';

export interface IParty extends Document {
    name: string;
    leaderId: string;
    members: string[];
    createdAt: Date;
}

const partySchema = new Schema<IParty>({
    name: { type: String, required: true, unique: true },
    leaderId: { type: String, required: true },
    members: { type: [String], required: true, default: [] },
    createdAt: { type: Date, default: Date.now },
});

const Party = model<IParty>('Party', partySchema);

export default Party;
